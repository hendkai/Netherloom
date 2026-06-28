import { useMemo, useState } from "react";
import { Coins, Search } from "lucide-react";
import { PET_CATALOG, PET_COUNT, getPet } from "../lib/pets";
import { formatNumber } from "../lib/observatory";
import { PetSprite } from "../components/PetSprite";
import { useObservatory } from "../state/ObservatoryProvider";

const PAGE_SIZE = 24;

export function CollectionView() {
  const {
    creature,
    creatureFilter,
    creatureName,
    progression,
    coins,
    ownedPets,
    loadouts,
    equipped,
    adoptPet,
    activatePet,
  } = useObservatory();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const ownedSet = useMemo(() => new Set(ownedPets), [ownedPets]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return PET_CATALOG;
    return PET_CATALOG.filter((pet) =>
      `${pet.name} ${pet.baseId} ${pet.rarity} ${pet.affinity} ${pet.trait}`.toLowerCase().includes(needle),
    );
  }, [query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visiblePets = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const activePet = creature ? getPet(creature.id) : null;

  return (
    <section className="view-page">
      <header className="view-head">
        <div>
          <h2>Pet Atlas</h2>
          <p>{formatNumber(PET_COUNT)} deterministic companions with stable identities, rarities and affinities.</p>
        </div>
        <div className="economy-summary">
          <span><Coins size={16} /> {formatNumber(coins)}</span>
          <span>{formatNumber(ownedPets.length)} owned</span>
        </div>
      </header>

      <section className="active-pet-panel">
        <div className="active-pet-art">
          <PetSprite
            petId={creature?.id ?? ""}
            equipped={equipped}
            size={68}
            baseScale={progression?.stage.scale ?? 1}
            filter={creatureFilter}
            alt={creatureName}
          />
        </div>
        <div>
          <span>Active Companion</span>
          <h3>{creatureName}</h3>
          <p>{activePet?.rarity ?? "Common"} · {activePet?.affinity ?? "Network"} affinity · Level {progression?.level ?? 0}</p>
        </div>
      </section>

      <section className="owned-pets-panel">
        <div className="loadout-title">
          <strong>My Pets</strong>
          <span>Gear and strengthening effects are saved separately for every pet.</span>
        </div>
        <div className="owned-pets-strip">
          {ownedPets.slice(0, 12).map((petId) => {
            const pet = getPet(petId);
            const active = creature?.id === petId;
            return (
              <button
                key={petId}
                className={active ? "active" : ""}
                disabled={active}
                onClick={() => {
                  activatePet(petId);
                  setMessage(`${pet.name} is now your active companion.`);
                }}
              >
                <PetSprite
                  petId={petId}
                  equipped={loadouts[petId]}
                  size={38}
                  filter={pet.filter}
                  alt={pet.name}
                />
                <span>{pet.name}</span>
                <small>{active ? "Active" : "Switch"}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="atlas-toolbar">
        <label className="atlas-search">
          <Search size={15} />
          <input
            value={query}
            placeholder="Search name, rarity, affinity…"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <span>{formatNumber(filtered.length)} pets · Page {safePage + 1} / {pageCount}</span>
      </div>

      {message ? <div className="atlas-message" role="status">{message}</div> : null}

      <div className="pet-atlas-grid">
        {visiblePets.map((pet) => {
          const owned = ownedSet.has(pet.id);
          const active = creature?.id === pet.id;
          return (
            <article className={`pet-card rarity-${pet.rarity.toLowerCase()}`} key={pet.id}>
              <div className="pet-card-art" style={{ borderColor: pet.accent }}>
                {owned ? (
                  <PetSprite
                    petId={pet.id}
                    equipped={loadouts[pet.id]}
                    size={96}
                    filter={pet.filter}
                    alt={pet.name}
                  />
                ) : (
                  <img src={pet.sprite} style={{ filter: pet.filter }} alt="" />
                )}
              </div>
              <span>{pet.rarity} · {pet.affinity}</span>
              <h3>{pet.name}</h3>
              <p>{pet.trait} · ID {pet.id}</p>
              {owned ? (
                <button
                  className={active ? "active" : ""}
                  disabled={active}
                  onClick={() => {
                    activatePet(pet.id);
                    setMessage(`${pet.name} is now your active companion.`);
                  }}
                >
                  {active ? "Active" : "Activate"}
                </button>
              ) : (
                <button
                  disabled={coins < pet.adoptionCost}
                  onClick={() => {
                    const adopted = adoptPet(pet.id);
                    setMessage(adopted ? `${pet.name} joined your collection.` : "Not enough coins.");
                  }}
                >
                  <Coins size={13} /> Adopt {formatNumber(pet.adoptionCost)}
                </button>
              )}
            </article>
          );
        })}
      </div>

      <div className="atlas-pagination">
        <button disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
        <span>{safePage + 1} / {pageCount}</span>
        <button disabled={safePage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Next</button>
      </div>
    </section>
  );
}
