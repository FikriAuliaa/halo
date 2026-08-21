"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { DataDisplay } from "@/components/ui/data-display";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { EmailField } from "@/components/ui/email-field";
import { PhoneField } from "@/components/ui/phone-field";
import { SelectField } from "@/components/ui/select-field";
import { Card, GradientCard } from "@/components/ui/card";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Chip } from "@/components/ui/chip";
import { Badge } from "@/components/ui/badge";
import { NumberStatusBadge, OrderStatusBadge } from "@/components/ui/status-badge";
import { NUMBER_STATUSES, ORDER_STATUSES } from "@/domain/status";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ReservationTimer } from "@/components/student/reservation-timer";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast-provider";
import { useToast } from "@/hooks/use-toast";
import { FileUploader, type FileUploaderState } from "@/components/ui/file-uploader";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberGridSkeleton } from "@/components/ui/skeletons/number-grid-skeleton";
import { PackageScrollerSkeleton } from "@/components/ui/skeletons/package-scroller-skeleton";
import { OrderFormSkeleton } from "@/components/ui/skeletons/order-form-skeleton";
import { AdminTableSkeleton } from "@/components/ui/skeletons/admin-table-skeleton";
import { EmptyState, EMPTY_STATE_PRESETS } from "@/components/ui/empty-state";
import { ErrorState, type ErrorStateVariant } from "@/components/ui/error-state";
import { StepIndicator } from "@/components/student/step-indicator";
import { ResponsiveGrid } from "@/components/ui/responsive-grid";

const ERROR_VARIANTS: ErrorStateVariant[] = [
  "network",
  "server",
  "not-found",
  "forbidden",
  "expired",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-md border-b border-divider pb-xl">
      <Heading as="h2" variant="title-md">
        {title}
      </Heading>
      {children}
    </section>
  );
}

function ToastDemo() {
  const { showToast } = useToast();
  return (
    <div className="flex gap-sm">
      <Button size="sm" onClick={() => showToast("success", "Berhasil disimpan")}>
        Success
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => showToast("error", "Gagal mengunggah bukti")}
      >
        Error
      </Button>
      <Button size="sm" variant="secondary" onClick={() => showToast("info", "Info notifikasi")}>
        Info
      </Button>
    </div>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex gap-sm">
      <Button size="sm" onClick={() => setOpen(true)}>
        Open Dialog
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Contoh Dialog"
        description="Deskripsi contoh."
      >
        <Button size="sm" onClick={() => setOpen(false)}>
          Tutup
        </Button>
      </Dialog>
      <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)}>
        Open ConfirmDialog
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Tandai Terjual Offline?"
        description="Tindakan ini tidak dapat dibatalkan."
        onConfirm={() => {}}
      />
    </div>
  );
}

function FileUploaderDemo() {
  const [state, setState] = useState<FileUploaderState>("idle");
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-wrap gap-1">
        {(["idle", "selected", "uploading", "error", "success"] as const).map((s) => (
          <Button key={s} size="sm" variant="ghost" onClick={() => setState(s)}>
            {s}
          </Button>
        ))}
      </div>
      <FileUploader
        state={state}
        file={file}
        progressPercent={60}
        errorMessage="File terlalu besar."
        onFileSelected={(f) => {
          setFile(f);
          setState("selected");
        }}
        onRemove={() => setState("idle")}
        onRetry={() => setState("idle")}
        onCancel={() => setState("idle")}
      />
    </div>
  );
}

export default function GalleryPage() {
  // Excluded from production entirely (B047) — not just unlinked, actually
  // unreachable, since an unlinked-but-reachable dev route is still a real
  // route in a real deployment.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const now = new Date();

  return (
    <ToastProvider>
      <main className="mx-auto flex max-w-4xl flex-col gap-xl bg-background p-lg text-on-surface">
        <Heading as="h1" variant="display-lg">
          Component Gallery (dev only)
        </Heading>

        <Section title="Typography">
          <div className="flex flex-col gap-2">
            <Text variant="body-lg">Body LG</Text>
            <Text variant="body-sm">Body SM</Text>
            <Text variant="label-bold">Label Bold</Text>
            <DataDisplay value={160} unit="GB" />
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-sm">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Form fields">
          <div className="flex max-w-sm flex-col gap-md">
            <TextField label="Nama Lengkap" placeholder="Masukkan nama" />
            <TextField label="Dengan Error" error="Wajib diisi" />
            <EmailField label="Email" placeholder="alamat@email.com" />
            <PhoneField label="Nomor WhatsApp" value="" onValueChange={() => {}} />
            <SelectField
              label="Universitas"
              placeholder="Pilih universitas"
              value={undefined}
              onValueChange={() => {}}
              options={[{ value: "unair", label: "Universitas Airlangga" }]}
            />
          </div>
        </Section>

        <Section title="Cards">
          <div className="flex flex-wrap gap-md">
            <Card className="w-48">Base Card</Card>
            <GradientCard className="w-48">Gradient Card</GradientCard>
            <SelectableCard selected={false} onSelect={() => {}} className="w-48">
              Unselected
            </SelectableCard>
            <SelectableCard selected onSelect={() => {}} className="w-48">
              Selected
            </SelectableCard>
            <SelectableCard selected={false} disabled onSelect={() => {}} className="w-48">
              Disabled
            </SelectableCard>
          </div>
        </Section>

        <Section title="Chips and badges">
          <div className="flex flex-wrap items-center gap-sm">
            <Chip>Pilih 1 Extra Benefit</Chip>
            <Badge variant="orange">Terkunci</Badge>
            <Badge variant="red">Sold</Badge>
            <Badge variant="outline">Available</Badge>
            <Badge variant="neutral">Neutral</Badge>
            {NUMBER_STATUSES.map((s) => (
              <NumberStatusBadge key={s} status={s} />
            ))}
            {ORDER_STATUSES.map((s) => (
              <OrderStatusBadge key={s} status={s} />
            ))}
          </div>
        </Section>

        <Section title="Progress and timer">
          <div className="flex max-w-sm flex-col gap-md">
            <ProgressBar percent={40} aria-label="Contoh progres" />
            <ProgressBar percent={90} tone="error" aria-label="Contoh progres error" />
            <ReservationTimer
              reservedAt={now}
              reservedUntil={new Date(now.getTime() + 15 * 60_000)}
            />
          </div>
        </Section>

        <Section title="Dialogs">
          <DialogDemo />
        </Section>

        <Section title="Toasts">
          <ToastDemo />
        </Section>

        <Section title="File uploader">
          <FileUploaderDemo />
        </Section>

        <Section title="Skeletons">
          <div className="flex flex-col gap-md">
            <Skeleton className="h-8 w-32" />
            <NumberGridSkeleton count={3} />
            <PackageScrollerSkeleton count={2} />
            <OrderFormSkeleton />
            <AdminTableSkeleton rows={3} />
          </div>
        </Section>

        <Section title="Empty states">
          <div className="flex flex-wrap gap-lg">
            {Object.entries(EMPTY_STATE_PRESETS).map(([key, preset]) => {
              const hasAction = "actionLabel" in preset;
              return (
                <EmptyState key={key} {...preset} {...(hasAction ? { onAction: () => {} } : {})} />
              );
            })}
          </div>
        </Section>

        <Section title="Error states">
          <div className="flex flex-wrap gap-lg">
            {ERROR_VARIANTS.map((variant) => (
              <ErrorState key={variant} variant={variant} onRetry={() => {}} />
            ))}
          </div>
        </Section>

        <Section title="Step indicator">
          <div className="flex flex-col gap-sm">
            <StepIndicator currentStep={1} />
            <StepIndicator currentStep={2} />
            <StepIndicator currentStep={3} />
            <StepIndicator currentStep={4} />
          </div>
        </Section>

        <Section title="Responsive grid">
          <ResponsiveGrid behavior="grid-always">
            {[1, 2, 3].map((i) => (
              <Card key={i}>Item {i}</Card>
            ))}
          </ResponsiveGrid>
        </Section>
      </main>
    </ToastProvider>
  );
}
