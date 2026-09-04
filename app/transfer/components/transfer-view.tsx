"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { getBankIcon } from "@/lib/bank-icons"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, CreditCard, WarningCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useTransferViewModel } from "../hooks/use-transfer-view-model"

export function TransferView() {
    const {
        router,
        debitCards,
        familyMembers,
        fromCardId,
        setFromCardId,
        toMemberId,
        setToMemberId,
        toCardId,
        setToCardId,
        toCardOptions,
        amount,
        handleAmountChange,
        description,
        setDescription,
        handleSubmit
    } = useTransferViewModel()

    if (debitCards.length === 0) {
        return (
            <AppLayout>
                <PageHeader title="Transferir entre Contas" subtitle="Mova valores entre seus cartões" />

                <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                        <WarningCircle size={40} className="text-muted-foreground" weight="duotone" />
                    </div>

                    <div className="space-y-2 max-w-sm">
                        <h3 className="text-xl font-semibold text-foreground">Transferência indisponível</h3>
                        <p className="text-muted-foreground">
                            Para realizar transferências, você precisa ter pelo menos <b>1 conta de débito</b> cadastrada.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Nota: Cartões de crédito não realizam transferências.
                        </p>
                    </div>

                    <Button
                        onClick={() => router.push("/cards")}
                        className="w-full max-w-xs h-12 rounded-[1vw] font-semibold gap-2 text-background"
                    >
                        <CreditCard size={20} weight="bold" />
                        Gerenciar Cartões
                    </Button>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <PageHeader title="Transferir entre Contas" subtitle="Mova valores entre seus cartões" />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* From Card */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">De qual conta?</label>
                    <div className="grid grid-cols-1 gap-2">
                        {debitCards.map((card) => {
                            const BankIcon = getBankIcon(card.bankName)
                            return (
                                <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => setFromCardId(card.id)}
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-[1vw] border-2 transition-all",
                                        fromCardId === card.id
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border bg-card hover:bg-muted",
                                    )}
                                >
                                    <div
                                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: card.color + "20" }}
                                    >
                                        <BankIcon size={28} color={card.color} weight="fill" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-base font-semibold text-foreground">{card.name}</p>
                                        <p className="text-sm text-muted-foreground">•••• {card.lastDigits}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Arrow Indicator */}
                {fromCardId && (
                    <div className="flex justify-center">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <ArrowRightIcon size={24} weight="bold" className="text-primary" />
                        </div>
                    </div>
                )}

                {/* Destination: own accounts vs a family member's account */}
                {fromCardId && familyMembers.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Para quem?</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setToMemberId("")}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all",
                                    !toMemberId ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted",
                                )}
                            >
                                Minhas contas
                            </button>
                            {familyMembers.map((member) => (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => setToMemberId(member.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all",
                                        toMemberId === member.id ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted",
                                    )}
                                >
                                    {member.name || member.email}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* To Card */}
                {fromCardId && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Para qual conta?</label>
                        {toCardOptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-4 rounded-[1vw] border border-dashed border-border">
                                {toMemberId
                                    ? "Essa pessoa ainda não tem uma conta de débito cadastrada."
                                    : "Você não tem outra conta de débito. Cadastre mais uma ou envie para um parceiro da família."}
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {toCardOptions.map((card) => {
                                    const BankIcon = getBankIcon(card.bankName)
                                    return (
                                        <button
                                            key={card.id}
                                            type="button"
                                            onClick={() => setToCardId(card.id)}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-[1vw] border-2 transition-all",
                                                toCardId === card.id
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border bg-card hover:bg-muted",
                                            )}
                                        >
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                                style={{ backgroundColor: card.color + "20" }}
                                            >
                                                <BankIcon size={28} color={card.color} weight="fill" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-base font-semibold text-foreground">{card.name}</p>
                                                <p className="text-sm text-muted-foreground">•••• {card.lastDigits}</p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Amount */}
                {toCardId && (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Valor</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    placeholder="0,00"
                                    className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
                                    required
                                />
                            </div>
                        </div>

                        {/* Description (optional) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Descrição (opcional)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ex: Pagamento de aluguel"
                                className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </>
                )}

                {/* Submit */}
                {toCardId && (
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-12 rounded-[1vw] bg-transparent"
                            onClick={() => router.push("/")}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-1 h-12 rounded-[1vw] font-semibold">
                            Transferir
                        </Button>
                    </div>
                )}
            </form>
        </AppLayout>
    )
}
