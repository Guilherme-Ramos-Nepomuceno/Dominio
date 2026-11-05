"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Moon, Sun, PencilSimple, Trash, SignOut, Target, CaretRight, Bank, ListChecks, ChartLineUp, Link as LinkIcon, Wallet } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { AppSelect } from "@/components/ui/app-select"
import { useSettingsViewModel } from "../hooks/use-settings-view-model"
import { CoupleSplitSetting } from "./couple-split-setting"
import { NotificationsSection } from "./notifications-section"

// Para onde vai a sobra (ou o excesso) de uma semana — muda o limite das próximas.
const CARRY_OVER_OPTIONS = [
    {
        value: "MONTH",
        label: "Ajusta as próximas semanas",
        hint: "Sobrou R$ 50? As próximas semanas ganham esse valor. Passou? Elas ficam um pouco menores.",
    },
    {
        value: "WEEK",
        label: "Fica naquela semana",
        hint: "Toda semana tem o mesmo limite. O que sobra vira sobra do mês; o que passa sai dela.",
    },
] as const

const fieldClass =
    "w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

// Uma seção da página: título pequeno e as linhas com divisória, sem cartão.
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    return (
        <section aria-labelledby={id} className="scroll-mt-24">
            <SectionTitle id={id}>{title}</SectionTitle>
            <div className="mt-1 divide-y divide-border">{children}</div>
        </section>
    )
}

// Linha que abre outra tela.
function LinkRow({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
    return (
        <Link href={href} className="group flex items-center gap-3 py-3.5">
            <span className="shrink-0 text-muted-foreground">{icon}</span>
            <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground">{title}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
            </span>
            <CaretRight size={12} weight="bold" className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
    )
}

export function SettingsView() {
    const {
        theme,
        toggleTheme,
        family,
        invitingFamily,
        inviteLink,
        handleCreateInvite,
        creatingCoupleAccount,
        handleCreateCoupleAccount,
        currency,
        setCurrency,
        monthStartDay,
        weekCarryOver,
        setWeekCarryOver,
        setMonthStartDay,
        showClearDialog,
        setShowClearDialog,
        user,
        setUser,
        handleUpdateProfile,
        handleSave,
        handleLogout,
        confirmClearData,
        loading,
        updatingProfile,
        savingSettings,
        clearingData,
        isAdmin,
    } = useSettingsViewModel()
    // Nome e email só viram campos ao tocar em "Editar"; Cancelar volta ao
    // que estava antes de abrir.
    const [profileBackup, setProfileBackup] = useState<typeof user>(null)
    const editingProfile = profileBackup !== null

    if (loading) {
        return (
            <AppLayout>
                <PageHeader back="/all-menus" title="Configurações" />
                <div className="max-w-2xl mx-auto space-y-10 pb-10" aria-busy>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-36 rounded-full" />
                            <Skeleton className="h-3 w-48 rounded-full" />
                        </div>
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            </AppLayout>
        )
    }

    const personalMembers = family?.members?.filter((m) => m.accountType === "PERSONAL") ?? []
    const hasCoupleAccount = !!family?.members?.some((m) => m.accountType === "COUPLE")
    const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase()

    return (
        <AppLayout>
            <PageHeader back="/all-menus" title="Configurações" />

            <div className="max-w-2xl mx-auto space-y-10 pb-10">
                {/* Perfil */}
                {user ? (
                    <form
                        onSubmit={async (e) => {
                            await handleUpdateProfile(e)
                            setProfileBackup(null)
                        }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground" aria-hidden>
                                {initial}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-foreground">{user.name || "Sem nome"}</p>
                                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            {!editingProfile && (
                                <button
                                    type="button"
                                    onClick={() => setProfileBackup(user)}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                                >
                                    <PencilSimple size={14} weight="bold" aria-hidden />
                                    Editar
                                </button>
                            )}
                        </div>
                        {editingProfile && (
                            <>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="space-y-1">
                                        <span className="block text-xs font-medium text-muted-foreground">Nome</span>
                                        <input
                                            type="text"
                                            value={user.name}
                                            onChange={(e) => setUser({ ...user, name: e.target.value })}
                                            autoFocus
                                            className={fieldClass}
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="block text-xs font-medium text-muted-foreground">Email</span>
                                        <input
                                            type="email"
                                            value={user.email}
                                            onChange={(e) => setUser({ ...user, email: e.target.value })}
                                            className={fieldClass}
                                        />
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUser(profileBackup)
                                            setProfileBackup(null)
                                        }}
                                        disabled={updatingProfile}
                                        className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updatingProfile}
                                        className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        {updatingProfile ? "Salvando..." : "Salvar"}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>
                ) : (
                    <p className="text-sm text-muted-foreground">Usuário não identificado.</p>
                )}

                {/* Preferências: tema, início do mês, semanas e moeda. Orçamento e
                    metas ficam no plano do mês (a API ainda guarda a meta antiga como
                    reserva para meses sem plano — ela não aparece mais aqui). */}
                <Section id="settings-prefs" title="Preferências">
                    <div className="flex items-center justify-between gap-3 py-3.5">
                        <span className="text-sm font-medium text-foreground">Tema</span>
                        <div className="flex rounded-full border border-border p-0.5" role="radiogroup" aria-label="Tema">
                            {(["light", "dark"] as const).map((value) => {
                                const active = theme === value
                                const Icon = value === "dark" ? Moon : Sun
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => !active && toggleTheme()}
                                        className={cn(
                                            "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors",
                                            active ? "bg-foreground text-background font-semibold" : "text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        <Icon size={14} weight={active ? "fill" : "regular"} aria-hidden />
                                        {value === "dark" ? "Escuro" : "Claro"}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="py-3.5">
                        <div className="flex items-center justify-between gap-3">
                            <label htmlFor="month-start-day" className="text-sm font-medium text-foreground">
                                Meu mês começa no dia
                            </label>
                            <AppSelect
                                variant="pill"
                                id="month-start-day"
                                value={String(monthStartDay)}
                                onChange={(v) => setMonthStartDay(Number(v))}
                                options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                                className="tabular-nums"
                            />
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                            {monthStartDay === 1
                                ? "Mês do calendário: do dia 1 ao último dia."
                                : `Novembro vai de ${monthStartDay} nov até a véspera de ${monthStartDay} dez. Útil se o salário cai no dia ${monthStartDay}.`}
                        </p>
                    </div>

                    <fieldset id="semanas" className="scroll-mt-24 py-3.5">
                        <legend className="mb-2 text-sm font-medium text-foreground">Quando sobrar ou passar numa semana</legend>
                        <div className="grid gap-2">
                            {CARRY_OVER_OPTIONS.map((option) => {
                                const active = weekCarryOver === option.value
                                return (
                                    <label
                                        key={option.value}
                                        className={cn(
                                            "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                                            active ? "border-foreground/60" : "border-border hover:border-muted-foreground/40",
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="week-carry-over"
                                            value={option.value}
                                            checked={active}
                                            onChange={() => setWeekCarryOver(option.value)}
                                            className="mt-0.5 accent-primary"
                                        />
                                        <span>
                                            <span className="block text-sm font-medium text-foreground">{option.label}</span>
                                            <span className="block text-xs text-muted-foreground">{option.hint}</span>
                                        </span>
                                    </label>
                                )
                            })}
                        </div>
                    </fieldset>

                    <div className="flex items-center justify-between gap-3 py-3.5">
                        <label htmlFor="currency" className="text-sm font-medium text-foreground">
                            Moeda
                        </label>
                        <AppSelect
                            variant="pill"
                            id="currency"
                            value={currency}
                            onChange={setCurrency}
                            options={[
                                { value: "BRL", label: "Real (BRL)" },
                                { value: "USD", label: "Dólar (USD)" },
                                { value: "EUR", label: "Euro (EUR)" },
                            ]}
                        />
                    </div>

                    <div className="py-4">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={savingSettings}
                            className="flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {savingSettings ? "Salvando..." : "Salvar preferências"}
                        </button>
                    </div>
                </Section>

                {/* Atalhos para as telas de configuração mais finas */}
                <Section id="settings-more" title="Dinheiro e dados">
                    <LinkRow
                        href="/plan"
                        icon={<Target size={20} weight="duotone" />}
                        title="Orçamento e metas"
                        description="Ficam no plano do mês, com os grupos e os desejos."
                    />
                    <LinkRow
                        href="/bank-sync"
                        icon={<Bank size={20} weight="duotone" />}
                        title="Sincronização bancária"
                        description="Importa o extrato pela Pluggy, sem subir arquivo."
                    />
                    <LinkRow
                        href="/rules"
                        icon={<ListChecks size={20} weight="duotone" />}
                        title="Regras de categoria"
                        description="Estabelecimentos que entram categorizados sozinhos."
                    />
                    {isAdmin && (
                        <LinkRow
                            href="/admin"
                            icon={<ChartLineUp size={20} weight="duotone" />}
                            title="Admin"
                            description="Métricas de uso e eventos recentes."
                        />
                    )}
                </Section>

                {/* Família */}
                <Section id="settings-family" title="Família">
                    <div className="space-y-3 py-3.5">
                        <p className="text-sm text-muted-foreground">
                            Conecte sua conta com a de outra pessoa por um link de convite. Vocês veem os gastos um do outro (somente
                            leitura) e podem criar uma conta compartilhada do casal.
                        </p>

                        {family?.members && family.members.length > 0 && (
                            <ul className="divide-y divide-border rounded-xl border border-border">
                                {family.members.map((member) => (
                                    <li key={member.id} className="flex items-center gap-3 px-3.5 py-2.5">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold" aria-hidden>
                                            {(member.name || member.email || "?").charAt(0).toUpperCase()}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium text-foreground">{member.name || member.email}</span>
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {member.accountType === "COUPLE" ? "Conta do casal" : member.email}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {family?.pendingInvite && (
                            <p className="text-xs text-muted-foreground">
                                Convite pendente — expira em {new Date(family.pendingInvite.expiresAt).toLocaleDateString("pt-BR")}.
                            </p>
                        )}

                        {personalMembers.length < 2 && (
                            <button
                                type="button"
                                onClick={handleCreateInvite}
                                disabled={invitingFamily}
                                className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                            >
                                <LinkIcon size={16} weight="bold" />
                                {invitingFamily ? "Gerando link..." : "Gerar link de convite"}
                            </button>
                        )}

                        {inviteLink && <p className="break-all rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">{inviteLink}</p>}

                        {personalMembers.length === 2 && hasCoupleAccount && <CoupleSplitSetting />}

                        {personalMembers.length === 2 && !hasCoupleAccount && (
                            <button
                                type="button"
                                onClick={handleCreateCoupleAccount}
                                disabled={creatingCoupleAccount}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                <Wallet size={16} weight="bold" />
                                {creatingCoupleAccount ? "Criando..." : "Criar conta do casal"}
                            </button>
                        )}
                    </div>
                </Section>

                <NotificationsSection />

                {/* Conta: sair e, por último, a ação irreversível */}
                <Section id="settings-account" title="Conta">
                    <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 py-3.5 text-left">
                        <SignOut size={20} className="shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Sair</span>
                    </button>
                    <button type="button" onClick={() => setShowClearDialog(true)} className="flex w-full items-center gap-3 py-3.5 text-left">
                        <Trash size={20} className="shrink-0 text-expense" />
                        <span>
                            <span className="block text-sm font-medium text-expense">Apagar todas as transações</span>
                            <span className="block text-xs text-muted-foreground">Não dá para desfazer.</span>
                        </span>
                    </button>
                </Section>
            </div>

            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deseja realmente prosseguir?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação apagará <strong>TODAS</strong> as suas transações e dados permanentemente. Isso não pode ser desfeito.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={clearingData}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmClearData} disabled={clearingData} className="bg-destructive hover:bg-destructive/90 text-white">
                            {clearingData ? "Apagando..." : "Sim, apagar tudo"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
