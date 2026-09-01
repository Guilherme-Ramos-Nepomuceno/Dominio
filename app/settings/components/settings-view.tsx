"use client"

import { Moon, Sun, Warning, Trash, User as UserIcon, Envelope } from "@phosphor-icons/react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
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
import { useSettingsViewModel } from "../hooks/use-settings-view-model"

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
        spendingGoal,
        setSpendingGoal,
        currency,
        setCurrency,
        categoryGoals,
        categories,
        showClearDialog,
        setShowClearDialog,
        user,
        setUser,
        handleUpdateProfile,
        handleSave,
        confirmClearData,
        handlePercentageChange,
        totalPercentage,
        warnings,
    } = useSettingsViewModel()


    return (
        <AppLayout>
            <PageHeader title="Configurações" subtitle="Personalize seu aplicativo" />

            <div className="max-w-2xl mx-auto space-y-6 pb-10">

                {/* Personal Data */}
                <div className="rounded-[20px] bg-card p-6 border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Dados Pessoais</h3>
                    {user ? (
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                    <input
                                        type="text"
                                        value={user.name}
                                        onChange={(e) => setUser({ ...user, name: e.target.value })}
                                        className="w-full pl-10 px-4 py-2 rounded-xl bg-background border border-border"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                                <div className="relative">
                                    <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                    <input
                                        type="email"
                                        value={user.email}
                                        onChange={(e) => setUser({ ...user, email: e.target.value })}
                                        className="w-full pl-10 px-4 py-2 rounded-xl bg-background border border-border"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-bold hover:opacity-90">
                                    Salvar Perfil
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p className="text-muted-foreground">Usuário não identificado.</p>
                    )}
                </div>

                {/* Family */}
                <div className="rounded-[20px] bg-card p-6 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                        <PhosphorIcons.UsersThree size={24} weight="fill" className="text-primary" />
                        <h3 className="text-lg font-semibold">Família</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Conecte sua conta com a de outra pessoa por um link de convite. Vocês veem os gastos um do outro
                        (somente leitura) e podem criar uma conta compartilhada do casal.
                    </p>

                    {family?.members && family.members.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {family.members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-background">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{member.name || member.email}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {member.accountType === "COUPLE" ? "Conta do casal" : member.email}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {family?.pendingInvite && (
                        <p className="text-xs text-muted-foreground mb-4">
                            Convite pendente — expira em{" "}
                            {new Date(family.pendingInvite.expiresAt).toLocaleDateString("pt-BR")}.
                        </p>
                    )}

                    {(!family?.members || family.members.filter((m) => m.accountType === "PERSONAL").length < 2) && (
                        <button
                            onClick={handleCreateInvite}
                            disabled={invitingFamily}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold transition-all",
                                invitingFamily
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                            )}
                        >
                            <PhosphorIcons.Link size={20} weight="bold" />
                            {invitingFamily ? "Gerando link..." : "Gerar link de convite"}
                        </button>
                    )}

                    {inviteLink && (
                        <div className="mt-3 p-3 rounded-xl bg-muted/50 text-xs break-all text-muted-foreground">
                            {inviteLink}
                        </div>
                    )}

                    {family?.members &&
                        family.members.filter((m) => m.accountType === "PERSONAL").length === 2 &&
                        !family.members.some((m) => m.accountType === "COUPLE") && (
                            <button
                                onClick={handleCreateCoupleAccount}
                                disabled={creatingCoupleAccount}
                                className={cn(
                                    "w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold transition-all",
                                    creatingCoupleAccount
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-background hover:bg-primary/90"
                                )}
                            >
                                <PhosphorIcons.Wallet size={20} weight="bold" />
                                {creatingCoupleAccount ? "Criando..." : "Criar conta do casal"}
                            </button>
                        )}
                </div>

                {/* Theme Toggle */}
                <div className="rounded-[20px] bg-card p-6 border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Aparência</h3>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-foreground">Tema</p>
                            <p className="text-sm text-muted-foreground">Escolha entre claro ou escuro</p>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className="flex items-center gap-3 px-4 py-2 rounded-[1vw] bg-background hover:bg-muted-foreground/20 transition-colors"
                        >
                            {theme === "dark" ? (
                                <>
                                    <Moon weight="fill" size={20} />
                                    <span className="font-medium">Escuro</span>
                                </>
                            ) : (
                                <>
                                    <Sun weight="fill" size={20} />
                                    <span className="font-medium">Claro</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Financial Settings */}
                <div className="rounded-[20px] bg-card p-6 border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Configurações Financeiras</h3>

                    <div className="space-y-4">
                        {/* Spending Goal */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Meta para limite Mensal de Gastos</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={spendingGoal}
                                    onChange={(e) => setSpendingGoal(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">Defina o limite ideal de gastos mensais</p>
                        </div>

                        {/* Currency */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Moeda</label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="BRL">Real Brasileiro (BRL)</option>
                                <option value="USD">Dólar Americano (USD)</option>
                                <option value="EUR">Euro (EUR)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="rounded-[20px] bg-card p-6 border border-border/50">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Metas de Gasto por Categoria</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Defina percentuais para controlar seus gastos (total deve ser 100%)
                    </p>

                    {warnings.length > 0 && (
                        <div className="mb-4 p-4 rounded-[1vw] bg-expense/10 border border-expense/20">
                            <div className="flex items-start gap-2">
                                <Warning size={20} weight="fill" className="text-expense mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-semibold text-expense mb-1">Categorias Excedidas:</p>
                                    {warnings.map((w, i) => (
                                        <p key={i} className="text-sm text-expense">
                                            • {w}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 mb-4">
                        {categories.map((category) => {
                            const goal = categoryGoals.find((g) => g.categoryId === category.id)
                            const percentage = goal?.percentage || 0

                            const IconComponent = (category.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) || PhosphorIcons.Circle

                            return (
                                <div key={category.id} className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-background"
                                        style={{ color: category.color }}
                                    >
                                        {/* @ts-ignore */}
                                        <IconComponent size={20} weight="fill" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">{category.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={percentage}
                                            onChange={(e) => handlePercentageChange(category.id, Number.parseInt(e.target.value) || 0)}
                                            className="w-20 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-muted-foreground">%</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-[1vw] bg-background">
                        <span className="font-semibold text-foreground">Total</span>
                        <span
                            className={cn(
                                "text-xl font-bold",
                                totalPercentage === 100 ? "text-income" : totalPercentage > 100 ? "text-expense" : "text-foreground",
                            )}
                        >
                            {totalPercentage}%
                        </span>
                    </div>
                    {totalPercentage !== 100 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            {totalPercentage > 100 ? "Reduza" : "Aumente"} para atingir 100%
                        </p>
                    )}
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    className="w-full py-3 px-4 bg-primary text-background rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
                >
                    Salvar Configurações
                </button>

                {/* Danger Zone */}
                <div className="rounded-[20px] bg-card p-6 border border-expense/30 mt-8">
                    <div className="flex items-center gap-2 mb-4 text-expense">
                        <Warning size={24} weight="fill" />
                        <h3 className="text-lg font-semibold">Zona de Perigo</h3>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6">
                        Ações aqui são irreversíveis. Tenha certeza antes de prosseguir.
                    </p>

                    <button
                        onClick={() => setShowClearDialog(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-transparent border-2 border-expense text-expense rounded-[1vw] font-semibold hover:bg-expense hover:text-white transition-all"
                    >
                        <Trash size={20} weight="bold" />
                        Apagar Todas as Transações
                    </button>
                </div>

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
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmClearData} className="bg-destructive hover:bg-destructive/90 text-white">
                            Sim, apagar tudo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
