import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Cable,
  Hash,
  Loader2,
  PhoneIncoming,
  RefreshCw,
  Route,
  Search,
  Workflow,
} from 'lucide-react';

import { getApiErrorMessage } from '../../api/client';
import { companiesApi } from '../companies/companies.api';
import {
  callRoutingApi,
  type IvrSummary,
  type LocalDidRoute,
} from '../call-routing/api/call-routing.api';

type Company = Awaited<ReturnType<typeof companiesApi.listMine>>[number];

function hasCompanyAccess(company: Company) {
  return company.status === 'ACTIVE' &&
    Boolean(company.wazoTenantUuid) &&
    company.memberships.some(
      (member) => member.role === 'COMPANY_ADMIN' || member.role === 'SUPERVISOR'
    );
}

function destinationLabel(did: LocalDidRoute, ivrs: IvrSummary[]) {
  if (did.destination?.type === 'ivr') {
    const id = Number(did.destination.ivr_id);
    return ivrs.find((ivr) => Number(ivr.id) === id)?.name || `IVR #${id || 'unknown'}`;
  }
  return did.destination?.type ? `Destination: ${did.destination.type}` : 'Destination unavailable';
}

function ErrorNotice({ error }: { error: unknown }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-background p-4 text-sm text-danger">
      <AlertCircle className="mt-0.5 shrink-0" size={18} />
      <span>{getApiErrorMessage(error)}</span>
    </div>
  );
}

export default function PhoneNumbersPage() {
  const queryClient = useQueryClient();
  const [tenantUuid, setTenantUuid] = useState('');
  const [search, setSearch] = useState('');

  const companiesQuery = useQuery({
    queryKey: ['account', 'companies'],
    queryFn: companiesApi.listMine,
    staleTime: 30_000,
  });

  const companies = useMemo(
    () => (companiesQuery.data ?? []).filter(hasCompanyAccess),
    [companiesQuery.data]
  );

  useEffect(() => {
    if (companies.some((company) => company.wazoTenantUuid === tenantUuid)) return;
    setTenantUuid(companies[0]?.wazoTenantUuid || '');
  }, [companies, tenantUuid]);

  const didsQuery = useQuery({
    queryKey: ['routing', 'dids', tenantUuid],
    queryFn: () => callRoutingApi.listLocalDids(tenantUuid),
    enabled: Boolean(tenantUuid),
  });

  const ivrsQuery = useQuery({
    queryKey: ['ivr', tenantUuid],
    queryFn: () => callRoutingApi.listIvrs(tenantUuid),
    enabled: Boolean(tenantUuid),
  });

  const dids = didsQuery.data ?? [];
  const ivrs = ivrsQuery.data ?? [];

  const filteredDids = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dids;
    return dids.filter((did) =>
      [did.did, String(did.incallId), destinationLabel(did, ivrs)]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [dids, ivrs, search]);

  const configuredCount = dids.filter((did) => did.configured).length;
  const carrierCount = dids.filter((did) => did.carrierConnected).length;
  const isRefreshing = didsQuery.isFetching || ivrsQuery.isFetching;

  async function refresh() {
    if (!tenantUuid) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['routing', 'dids', tenantUuid] }),
      queryClient.invalidateQueries({ queryKey: ['ivr', tenantUuid] }),
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <PhoneIncoming size={17} /> Company / Phone Numbers
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Phone Numbers</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View your company's configured incoming numbers and their call destinations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={!tenantUuid || isRefreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-cream disabled:opacity-50"
        >
          <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-warm bg-warm/15 p-4 text-sm leading-6 text-primary">
        <strong>Local testing only.</strong> The current backend lists Wazo test DIDs (eight digits beginning with 9).
        These are not public Saudi phone numbers. A real provider connection and verified number allocation are required
        before this page can show real carrier-assigned numbers.
      </div>

      {companiesQuery.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={18} className="animate-spin" /> Loading company details...
        </div>
      )}
      {companiesQuery.isError && <ErrorNotice error={companiesQuery.error} />}

      {!companiesQuery.isPending && !companiesQuery.isError && companies.length === 0 && (
        <div className="rounded-2xl border border-border bg-white p-8">
          <Building2 className="mb-3 text-primary" size={28} />
          <h2 className="text-lg font-bold text-primary">No active company available</h2>
          <p className="mt-2 text-sm text-muted">You need an approved company before you can see incoming numbers.</p>
          <Link to="/company" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline">
            My company <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {companies.length > 0 && (
        <>
          <section className="rounded-2xl border border-border bg-white p-5">
            <label htmlFor="numbers-company" className="mb-2 block text-sm font-semibold text-primary">Company</label>
            <select
              id="numbers-company"
              value={tenantUuid}
              onChange={(event) => { setTenantUuid(event.target.value); setSearch(''); }}
              className="w-full max-w-md rounded-xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none focus:border-primary"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.wazoTenantUuid || ''}>{company.name}</option>
              ))}
            </select>
          </section>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Test numbers" value={dids.length} icon={Hash} />
            <StatCard label="Configured destinations" value={configuredCount} icon={Route} />
            <StatCard label="Carrier-connected" value={carrierCount} icon={Cable} />
          </div>

          <section className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 className="text-lg font-bold text-primary">Number inventory</h2>
                <p className="mt-1 text-xs text-muted">Configured incoming-call numbers for this Wazo tenant</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search DID or IVR..."
                  aria-label="Search numbers"
                  className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm text-primary outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-3 p-5">
              {(didsQuery.isPending || ivrsQuery.isPending) && (
                <p className="flex items-center gap-2 py-8 text-sm text-muted"><Loader2 size={18} className="animate-spin" /> Loading numbers...</p>
              )}
              {didsQuery.isError && <ErrorNotice error={didsQuery.error} />}
              {ivrsQuery.isError && <ErrorNotice error={ivrsQuery.error} />}

              {!didsQuery.isPending && !didsQuery.isError && filteredDids.length === 0 && (
                <div className="py-12 text-center">
                  <PhoneIncoming className="mx-auto mb-3 text-muted" size={28} />
                  <h3 className="font-semibold text-primary">{search ? 'No matching numbers' : 'No phone numbers configured'}</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                    {search ? 'Try a different search.' : 'Create a local test DID from Call Routing. Real phone numbers will require a connected provider.'}
                  </p>
                  {!search && (
                    <Link to="/company/call-routing" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline">
                      Go to Call Routing <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              )}

              {!didsQuery.isPending && !didsQuery.isError && filteredDids.map((did) => (
                <article key={`${did.incallId}:${did.did}`} className="rounded-xl border border-border p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="rounded-xl bg-cream p-3 text-primary"><PhoneIncoming size={20} /></span>
                      <div>
                        <h3 className="font-mono text-lg font-bold tracking-wide text-primary">{did.did}</h3>
                        <p className="mt-1 text-xs text-muted">Local test DID · Wazo incall #{did.incallId}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-primary">
                      {did.configured ? 'Configured in Wazo' : 'Not configured'}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 rounded-xl bg-page p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted">Call destination</p>
                      <p className="mt-1 flex items-center gap-2 font-semibold text-primary"><Workflow size={16} /> {destinationLabel(did, ivrs)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Carrier connection</p>
                      <p className="mt-1 font-semibold text-primary">{did.carrierConnected ? 'Connected (reported)' : 'Not connected'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted">Incoming context</p>
                      <p className="mt-1 break-all font-mono text-xs text-primary">{did.contextName}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Link to="/company/call-routing" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                      Manage routing <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof PhoneIncoming;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <Icon size={21} className="mb-3 text-primary" />
      <p className="text-2xl font-bold tabular-nums text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}
