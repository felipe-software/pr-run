import { Button, Card, Input, Label, Surface } from "@heroui/react";

function App() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted">PR Run</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-normal">
            Vite, Tailwind CSS e HeroUI prontos para desenvolvimento.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Base React com TypeScript, Tailwind CSS v4 e componentes HeroUI v3.
          </p>
        </div>

        <Surface className="grid gap-6 rounded-lg border border-border bg-surface p-6 shadow-sm md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <Card className="rounded-lg">
              <Card.Header>
                <Card.Title>Ambiente configurado</Card.Title>
                <Card.Description>
                  Use os scripts Bun para compilar, testar integrações e
                  evoluir a interface.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Status label="Vite" value="8" />
                  <Status label="Tailwind" value="4" />
                  <Status label="HeroUI" value="3" />
                </div>
              </Card.Content>
              <Card.Footer>
                <Button variant="primary">Começar</Button>
              </Card.Footer>
            </Card>
          </div>

          <form className="flex flex-col gap-4">
            <Field label="Branch ou PR" placeholder="feat/demo" />
            <Field label="Comando" placeholder="bun run build" />
            <Button fullWidth variant="secondary">
              Preparar execução
            </Button>
          </form>
        </Surface>
      </section>
    </main>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Input fullWidth placeholder={placeholder} />
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default App;
