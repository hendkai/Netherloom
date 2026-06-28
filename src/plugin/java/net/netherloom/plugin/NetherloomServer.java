package net.netherloom.plugin;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.CodeSource;
import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class NetherloomServer {
  private static final int DEFAULT_PORT = 7667;
  private static final int MAX_BODY_BYTES = 262_144;
  private static volatile HttpServer server;

  private NetherloomServer() {}

  public static void main(String[] args) throws Exception {
    if (args.length > 0 && "stop".equalsIgnoreCase(args[0])) {
      stop();
      return;
    }

    int port = readPort(args);
    Path pluginDir = resolvePluginDir();
    Path webRoot = pluginDir.resolve("webapp").normalize();

    server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 32);
    server.createContext("/api/health", new HealthHandler());
    server.createContext("/api/i2pcontrol", new I2PControlProxy());
    server.createContext("/api/peers", new PeersHandler());
    server.createContext("/", new StaticHandler(webRoot));
    server.setExecutor(Executors.newFixedThreadPool(4));
    server.start();

    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
      HttpServer current = server;
      if (current != null) {
        current.stop(1);
      }
    }, "netherloom-shutdown"));

    System.out.println("Netherloom Observatory plugin serving " + webRoot + " on http://127.0.0.1:" + port + "/");
  }

  private static void stop() {
    HttpServer current = server;
    if (current != null) {
      current.stop(1);
      server = null;
      System.out.println("Netherloom Observatory plugin stopped");
    }
  }

  private static int readPort(String[] args) {
    if (args.length > 0) {
      try {
        return Integer.parseInt(args[0]);
      } catch (NumberFormatException ignored) {
        return DEFAULT_PORT;
      }
    }
    String configured = System.getProperty("netherloom.port", System.getenv("NETHERLOOM_PORT"));
    if (configured != null && !configured.isBlank()) {
      try {
        return Integer.parseInt(configured);
      } catch (NumberFormatException ignored) {
        return DEFAULT_PORT;
      }
    }
    return DEFAULT_PORT;
  }

  private static Path resolvePluginDir() throws Exception {
    CodeSource source = NetherloomServer.class.getProtectionDomain().getCodeSource();
    if (source == null || source.getLocation() == null) {
      return Path.of(".").toAbsolutePath().normalize();
    }
    Path jar = Path.of(source.getLocation().toURI()).toAbsolutePath().normalize();
    Path lib = jar.getParent();
    if (lib != null && "lib".equals(lib.getFileName().toString())) {
      Path pluginDir = lib.getParent();
      if (pluginDir != null) {
        return pluginDir;
      }
    }
    return jar.getParent() == null ? Path.of(".").toAbsolutePath().normalize() : jar.getParent();
  }

  private static byte[] readLimited(InputStream input) throws IOException {
    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    byte[] chunk = new byte[8192];
    int total = 0;
    int read;
    while ((read = input.read(chunk)) != -1) {
      total += read;
      if (total > MAX_BODY_BYTES) {
        throw new IOException("request body too large");
      }
      buffer.write(chunk, 0, read);
    }
    return buffer.toByteArray();
  }

  private static void send(HttpExchange exchange, int status, String contentType, byte[] body) throws IOException {
    Headers headers = exchange.getResponseHeaders();
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    if (!headers.containsKey("Cache-Control")) {
      headers.set("Cache-Control", status >= 400 ? "no-store" : "private, max-age=60");
    }
    exchange.sendResponseHeaders(status, body.length);
    try (OutputStream output = exchange.getResponseBody()) {
      output.write(body);
    }
  }

  private static void sendText(HttpExchange exchange, int status, String body) throws IOException {
    send(exchange, status, "text/plain; charset=utf-8", body.getBytes(StandardCharsets.UTF_8));
  }

  private static final class HealthHandler implements HttpHandler {
    @Override
    public void handle(HttpExchange exchange) throws IOException {
      if (!"GET".equals(exchange.getRequestMethod())) {
        sendText(exchange, 405, "method not allowed");
        return;
      }
      send(exchange, 200, "application/json; charset=utf-8",
          "{\"ok\":true,\"service\":\"netherloom\",\"mode\":\"i2p-plugin\"}".getBytes(StandardCharsets.UTF_8));
    }
  }

  private static final class I2PControlProxy implements HttpHandler {
    private final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
      if (!"POST".equals(exchange.getRequestMethod())) {
        sendText(exchange, 405, "method not allowed");
        return;
      }

      byte[] body;
      try {
        body = readLimited(exchange.getRequestBody());
      } catch (IOException e) {
        sendText(exchange, 413, "request body too large");
        return;
      }

      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create("http://127.0.0.1:7657/jsonrpc/"))
          .timeout(Duration.ofSeconds(15))
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofByteArray(body))
          .build();

      try {
        HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
        String contentType = response.headers().firstValue("content-type").orElse("application/json; charset=utf-8");
        send(exchange, response.statusCode(), contentType, response.body());
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        sendText(exchange, 502, "i2pcontrol proxy interrupted");
      } catch (Exception e) {
        send(exchange, 502, "application/json; charset=utf-8",
            "{\"error\":\"i2pcontrol_unavailable\",\"message\":\"Could not reach I2PControl at 127.0.0.1:7657\"}"
                .getBytes(StandardCharsets.UTF_8));
      }
    }
  }

  /**
   * Reads the active NTCP2 and SSU2 connection tables from the loopback router
   * console and returns peer router hashes as JSON. IP addresses are ignored.
   */
  private static final class PeersHandler implements HttpHandler {
    private static final Pattern HASH = Pattern.compile("netdb\\?r=([A-Za-z0-9~\\-]{40,}=?)");
    private static final int MAX_PEERS = 80;
    private final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
      if (!"GET".equals(exchange.getRequestMethod())) {
        sendText(exchange, 405, "method not allowed");
        return;
      }

      try {
        Set<String> hashes = new LinkedHashSet<>();
        int successfulTables = 0;
        String[] tables = { "ntcp", "ssu" };
        for (String table : tables) {
          HttpRequest request = HttpRequest.newBuilder()
              .uri(URI.create("http://127.0.0.1:7657/peers?tx=" + table))
              .timeout(Duration.ofSeconds(10))
              .GET()
              .build();
          HttpResponse<String> response =
              client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
          if (response.statusCode() != 200) continue;
          successfulTables += 1;
          Matcher matcher = HASH.matcher(response.body());
          while (matcher.find() && hashes.size() < MAX_PEERS) {
            hashes.add(matcher.group(1));
          }
        }
        if (successfulTables == 0) {
          send(exchange, 502, "application/json; charset=utf-8",
              "{\"error\":\"peer_tables_unavailable\"}".getBytes(StandardCharsets.UTF_8));
          return;
        }
        StringBuilder json = new StringBuilder("{\"peers\":[");
        boolean first = true;
        for (String hash : hashes) {
          if (!first) json.append(',');
          first = false;
          json.append('"').append(hash).append('"');
        }
        json.append("],\"count\":").append(hashes.size()).append('}');
        send(exchange, 200, "application/json; charset=utf-8", json.toString().getBytes(StandardCharsets.UTF_8));
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        sendText(exchange, 502, "peers fetch interrupted");
      } catch (Exception e) {
        send(exchange, 502, "application/json; charset=utf-8",
            "{\"error\":\"console_unreachable\"}".getBytes(StandardCharsets.UTF_8));
      }
    }
  }

  private static final class StaticHandler implements HttpHandler {
    private final Path webRoot;

    StaticHandler(Path webRoot) {
      this.webRoot = webRoot;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
      if (!"GET".equals(exchange.getRequestMethod()) && !"HEAD".equals(exchange.getRequestMethod())) {
        sendText(exchange, 405, "method not allowed");
        return;
      }

      String rawPath = exchange.getRequestURI().getPath();
      String path = rawPath == null || rawPath.equals("/") ? "/index.html" : rawPath;
      Path target = webRoot.resolve(path.substring(1)).normalize();
      if (!target.startsWith(webRoot) || !Files.exists(target) || Files.isDirectory(target)) {
        target = webRoot.resolve("index.html").normalize();
      }

      if (!Files.exists(target)) {
        sendText(exchange, 404, "not found");
        return;
      }

      byte[] body = "HEAD".equals(exchange.getRequestMethod()) ? new byte[0] : Files.readAllBytes(target);
      String name = target.getFileName().toString().toLowerCase(Locale.ROOT);
      exchange.getResponseHeaders().set(
          "Cache-Control",
          name.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable");
      send(exchange, 200, mimeType(target), body);
    }

    private static String mimeType(Path target) {
      String name = target.getFileName().toString().toLowerCase(Locale.ROOT);
      if (name.endsWith(".html")) return "text/html; charset=utf-8";
      if (name.endsWith(".js")) return "text/javascript; charset=utf-8";
      if (name.endsWith(".css")) return "text/css; charset=utf-8";
      if (name.endsWith(".json")) return "application/json; charset=utf-8";
      if (name.endsWith(".png")) return "image/png";
      if (name.endsWith(".svg")) return "image/svg+xml";
      if (name.endsWith(".ico")) return "image/x-icon";
      return "application/octet-stream";
    }
  }
}
