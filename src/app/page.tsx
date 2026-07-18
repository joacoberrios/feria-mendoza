import { getCurrentProfile } from "@/lib/supabase/profile";
import { formatFullName } from "@/lib/identity";
import { ButtonLink } from "@/components/ui/Button";

export default async function Home() {
  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10">
      <section className="relative overflow-hidden rounded-xl border border-border bg-surface p-8 shadow-md sm:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-pill opacity-20 blur-[2px]"
          style={{
            background:
              "conic-gradient(from 20deg, #4E63A8 0 14%, #A84A22 14% 30%, #6E4E96 30% 46%, #B23A3A 46% 60%, #4FA98C 60% 74%, #C4C4DD 74% 88%, #4E63A8 88% 100%)",
          }}
        />
        <p className="font-mono text-[.78rem] font-semibold tracking-[2px] text-terracota-deep uppercase">
          Marketplace local
        </p>
        <h1 className="relative z-10 mt-3.5 max-w-[16ch] font-display text-3xl leading-tight font-bold sm:text-4xl">
          Comprá y vendé en Mendoza, cerca tuyo.
        </h1>
        <p className="relative z-10 mt-4 max-w-[56ch] text-[1.05rem] text-ink-soft">
          {profile
            ? `Hola, ${formatFullName(profile) || profile.email} — publicá productos gratis y comprá con Mercado Pago.`
            : "Publicá gratis, encontrá lo que buscás y pagá seguro con Mercado Pago."}
        </p>
        <div className="relative z-10 mt-6 flex flex-wrap gap-3.5">
          <ButtonLink href="/productos" variant="primary">
            Ver catálogo
          </ButtonLink>
          {profile ? (
            <ButtonLink href="/publicar" variant="ghost">
              Publicar producto
            </ButtonLink>
          ) : (
            <ButtonLink href="/register" variant="ghost">
              Crear cuenta
            </ButtonLink>
          )}
        </div>
      </section>
    </main>
  );
}
