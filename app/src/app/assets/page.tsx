import type { Metadata } from 'next';
import Link from 'next/link';
import { AssetMiniCard } from '@/components/asset-mini-card';
import { ASSET_FUNCTION_GROUPS, ASSET_FUNCTION_LABELS } from '@/lib/taxonomy';
import { getAllAssets, listAssetFunctions, slugify, type AssetWithRef } from '@/lib/library';
import type { AssetFunction, AssetKind, AssetRole } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Assets — moteur de recherche',
  description:
    "Cherchez parmi tous les assets indexés par Argos : taglines, key visuals, TVC, OOH, manifestes, logos, etc. Filtrez par fonction marketing, type média, rôle ou marque parente.",
};

interface AssetsPageProps {
  searchParams: Promise<{
    q?: string;
    function?: string;
    kind?: string;
    role?: string;
    brand?: string;
    sector?: string;
  }>;
}

const KINDS: AssetKind[] = ['IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'EMBED_YOUTUBE', 'EMBED_VIMEO'];
const KIND_LABELS: Record<AssetKind, string> = {
  IMAGE: 'Image',
  VIDEO: 'Vidéo',
  AUDIO: 'Audio',
  TEXT: 'Texte',
  EMBED_YOUTUBE: 'YouTube',
  EMBED_VIMEO: 'Vimeo',
};

const ROLES: AssetRole[] = ['HERO', 'PRIMARY', 'DECLINATION', 'COMPANION', 'EXTRACTED'];
const ROLE_LABELS: Record<AssetRole, string> = {
  HERO: 'Hero',
  PRIMARY: 'Primaire',
  DECLINATION: 'Déclinaison',
  COMPANION: 'Compagnon',
  EXTRACTED: 'Extrait',
};

export default async function AssetsSearchPage({ searchParams }: AssetsPageProps) {
  const sp = await searchParams;
  const query = (sp.q ?? '').trim().toLowerCase();
  const fn = parseFunction(sp.function);
  const kind = (KINDS as string[]).includes(sp.kind ?? '') ? (sp.kind as AssetKind) : undefined;
  const role = (ROLES as string[]).includes(sp.role ?? '') ? (sp.role as AssetRole) : undefined;
  const brand = sp.brand?.trim() || undefined;
  const sector = sp.sector?.trim() || undefined;

  const all = await getAllAssets();
  const items = filterAssets(all, { query, fn, kind, role, brand, sector });
  const functionFacets = await listAssetFunctions();

  // Compute available kind/role/brand/sector facets from the current filtered set's
  // siblings so the rail reflects the data.
  const kindCounts = aggregateBy(all, (a) => a.asset.kind);
  const roleCounts = aggregateBy(all, (a) => a.asset.role);
  const brandCounts = aggregateBy(all, (a) => a.reference.brandEmitter);
  const sectorCounts = aggregateBy(all, (a) => a.reference.sector);

  const totalAll = all.length;

  return (
    <section className="view">
      <div className="wrap entity-page" style={{ paddingTop: 24 }}>
        <header className="entity-hero">
          <div className="eyebrow">
            Moteur d'assets · {items.length} / {totalAll} résultat{items.length > 1 ? 's' : ''}
          </div>
          <h1>
            Chercher un <span className="serif">asset.</span>
          </h1>
          <p className="deck">
            La clé d'Argos, ce sont les assets : taglines, manifestes, key visuals, TVC, OOH,
            logos, packagings. Cherchez par texte libre ou filtrez par fonction marketing, type
            média, rôle dans le bundle, marque ou secteur.{' '}
            <Link href="/search" style={{ color: 'var(--coral)', textDecoration: 'underline' }}>
              Chercher une opération complète →
            </Link>
          </p>

          {/* Search bar */}
          <form
            action="/assets"
            method="get"
            style={{
              marginTop: 18,
              display: 'flex',
              gap: 8,
              maxWidth: 760,
              alignItems: 'stretch',
            }}
          >
            <input
              name="q"
              defaultValue={query}
              placeholder="Cherchez : « Just Do It », « manifesto », « Walt Stack »…"
              aria-label="Recherche d'assets"
              style={{
                flex: 1,
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: '12px 16px',
                fontSize: 14,
                fontFamily: 'inherit',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
            {/* Preserve filters when re-searching */}
            {fn && <input type="hidden" name="function" value={slugify(fn)} />}
            {kind && <input type="hidden" name="kind" value={kind} />}
            {role && <input type="hidden" name="role" value={role} />}
            {brand && <input type="hidden" name="brand" value={brand} />}
            {sector && <input type="hidden" name="sector" value={sector} />}
            <button
              type="submit"
              style={{
                background: 'var(--dark)',
                color: '#fff',
                border: 0,
                borderRadius: 14,
                padding: '12px 22px',
                fontSize: 14,
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
              }}
            >
              Chercher
            </button>
          </form>

          {/* Active filters */}
          {(query || fn || kind || role || brand || sector) && (
            <div className="active-filters" style={{ marginTop: 12 }}>
              <span className="lab">Filtres actifs :</span>
              {query && (
                <FilterTag label={`texte : « ${query} »`} clearHref={buildHref({ fn, kind, role, brand, sector })} />
              )}
              {fn && (
                <FilterTag
                  label={`fonction : ${ASSET_FUNCTION_LABELS[fn]}`}
                  clearHref={buildHref({ query, kind, role, brand, sector })}
                />
              )}
              {kind && (
                <FilterTag
                  label={`média : ${KIND_LABELS[kind]}`}
                  clearHref={buildHref({ query, fn, role, brand, sector })}
                />
              )}
              {role && (
                <FilterTag
                  label={`rôle : ${ROLE_LABELS[role]}`}
                  clearHref={buildHref({ query, fn, kind, brand, sector })}
                />
              )}
              {brand && (
                <FilterTag
                  label={`marque : ${brand}`}
                  clearHref={buildHref({ query, fn, kind, role, sector })}
                />
              )}
              {sector && (
                <FilterTag
                  label={`secteur : ${sector}`}
                  clearHref={buildHref({ query, fn, kind, role, brand })}
                />
              )}
              <Link href="/assets" className="facet-clear">
                Tout effacer
              </Link>
            </div>
          )}
        </header>

        <div className="search-page">
          <aside className="facet-rail" aria-label="Filtres assets">
            <h2>Filtres</h2>

            <div className="facet-grp">
              <h3>Type média</h3>
              <div className="opts">
                {KINDS.filter((k) => kindCounts.get(k)).map((k) => {
                  const c = kindCounts.get(k) ?? 0;
                  return (
                    <Link
                      key={k}
                      href={buildHref({ query, fn, kind: kind === k ? undefined : k, role, brand, sector })}
                      className={kind === k ? 'on' : ''}
                    >
                      <span>{KIND_LABELS[k]}</span>
                      <span className="ct">{c}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="facet-grp">
              <h3>Rôle dans le bundle</h3>
              <div className="opts">
                {ROLES.filter((r) => roleCounts.get(r)).map((r) => {
                  const c = roleCounts.get(r) ?? 0;
                  return (
                    <Link
                      key={r}
                      href={buildHref({ query, fn, kind, role: role === r ? undefined : r, brand, sector })}
                      className={role === r ? 'on' : ''}
                    >
                      <span>{ROLE_LABELS[r]}</span>
                      <span className="ct">{c}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="facet-grp">
              <h3>Marque parente</h3>
              <div className="opts">
                {[...brandCounts.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([b, c]) => (
                    <Link
                      key={b}
                      href={buildHref({ query, fn, kind, role, brand: brand === b ? undefined : b, sector })}
                      className={brand === b ? 'on' : ''}
                    >
                      <span>{b}</span>
                      <span className="ct">{c}</span>
                    </Link>
                  ))}
              </div>
            </div>

            <div className="facet-grp">
              <h3>Secteur parent</h3>
              <div className="opts">
                {[...sectorCounts.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([s, c]) => (
                    <Link
                      key={s}
                      href={buildHref({ query, fn, kind, role, brand, sector: sector === s ? undefined : s })}
                      className={sector === s ? 'on' : ''}
                    >
                      <span>{s}</span>
                      <span className="ct">{c}</span>
                    </Link>
                  ))}
              </div>
            </div>

            {Object.entries(ASSET_FUNCTION_GROUPS).map(([group, fns]) => {
              const groupFacets = functionFacets.filter((f) => fns.includes(f.value));
              if (groupFacets.length === 0) return null;
              return (
                <div key={group} className="facet-grp">
                  <h3>{group}</h3>
                  <div className="opts">
                    {groupFacets.map((f) => (
                      <Link
                        key={f.slug}
                        href={buildHref({
                          query,
                          fn: fn === f.value ? undefined : f.value,
                          kind,
                          role,
                          brand,
                          sector,
                        })}
                        className={fn === f.value ? 'on' : ''}
                      >
                        <span>{ASSET_FUNCTION_LABELS[f.value]}</span>
                        <span className="ct">{f.count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </aside>

          <div className="search-results">
            {items.length === 0 ? (
              <div className="empty-results">
                <h2>
                  Aucun <span className="serif">asset</span> ne correspond.
                </h2>
                <p>
                  Élargissez les filtres ou soumettez un dossier via{' '}
                  <Link href="/admin/ingest" style={{ color: 'var(--coral)' }}>
                    /admin/ingest
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 14,
                }}
              >
                {items.map((item) => (
                  <AssetMiniCard
                    key={`${item.reference.slug}::${item.asset.id}`}
                    item={item}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function parseFunction(param: string | undefined): AssetFunction | undefined {
  if (!param) return undefined;
  const all = Object.keys(ASSET_FUNCTION_LABELS) as AssetFunction[];
  return all.find((f) => slugify(f) === param || f === param);
}

interface FilterState {
  query?: string;
  fn?: AssetFunction;
  kind?: AssetKind;
  role?: AssetRole;
  brand?: string;
  sector?: string;
}

function filterAssets(
  all: AssetWithRef[],
  f: { query: string; fn?: AssetFunction; kind?: AssetKind; role?: AssetRole; brand?: string; sector?: string },
): AssetWithRef[] {
  return all.filter((item) => {
    const { asset, reference } = item;
    if (f.fn && asset.function !== f.fn) return false;
    if (f.kind && asset.kind !== f.kind) return false;
    if (f.role && asset.role !== f.role) return false;
    if (f.brand && reference.brandEmitter !== f.brand) return false;
    if (f.sector && reference.sector !== f.sector) return false;
    if (f.query) {
      const hay = [
        asset.text ?? '',
        asset.caption ?? '',
        asset.alt ?? '',
        asset.format ?? '',
        asset.function,
        asset.role,
        reference.title,
        reference.brandEmitter,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(f.query)) return false;
    }
    return true;
  });
}

function aggregateBy<T extends string>(
  all: AssetWithRef[],
  pick: (a: AssetWithRef) => T,
): Map<T, number> {
  const map = new Map<T, number>();
  for (const a of all) {
    const k = pick(a);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

function buildHref(f: FilterState): string {
  const params = new URLSearchParams();
  if (f.query) params.set('q', f.query);
  if (f.fn) params.set('function', slugify(f.fn));
  if (f.kind) params.set('kind', f.kind);
  if (f.role) params.set('role', f.role);
  if (f.brand) params.set('brand', f.brand);
  if (f.sector) params.set('sector', f.sector);
  const qs = params.toString();
  return qs ? `/assets?${qs}` : '/assets';
}

function FilterTag({ label, clearHref }: { label: string; clearHref: string }) {
  return (
    <Link href={clearHref} className="ftag">
      {label}
      <span className="x" aria-hidden>
        ×
      </span>
    </Link>
  );
}
