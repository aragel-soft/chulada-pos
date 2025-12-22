import { useState } from 'react';
import { Search, Plus, X, Barcode, Printer, Wallet, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCashRegisterStore } from '@/stores/cashRegisterStore';
import { OpenShiftModal } from '@/features/cash-register/components/OpenShiftModal';
import { useAuthStore } from '@/stores/authStore';

export default function SalesPage() {
  const [activeTicket, setActiveTicket] = useState('ticket-1');
  const { shift } = useCashRegisterStore();
  const { can } = useAuthStore();

  return (
    <div className="flex-1 flex overflow-hidden gap-4 h-full">

      <div className="flex-1 flex flex-col gap-4 overflow-hidden">

        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Buscar productos..." className="pl-9 bg-white " />
        </div>

        <div className="flex-1 bg-white rounded-lg border border-dashed border-zinc-300 p-4 overflow-y-auto">
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">

              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} className="opacity-50 hover:opacity-100 cursor-pointer transition-opacity">
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="h-24 bg-zinc-100 rounded-md"></div>
                    <div className="h-4 bg-zinc-100 rounded w-3/4"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">$10.00</span>
                      <Badge variant="outline" className="text-xs">Inv: 10</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4 shrink-0 grid grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-muted-foreground block">Total</span>
            <span className="text-xl font-bold text-[#480489]">$0.00</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Pagó con</span>
            <span className="text-xl font-bold">$0.00</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Cambio</span>
            <span className="text-xl font-bold">$0.00</span>
          </div>
          <div className="flex justify-end items-center">
            <Button variant="outline" size="sm" className="border-[#480489] text-[#480489] hover:bg-purple-50">
              <Printer className="w-4 h-4 mr-2" /> Re-imprimir ticket
            </Button>
          </div>
        </div>
      </div>

      <div className="w-[400px] bg-white border rounded-lg flex flex-col shrink-0 relative overflow-hidden">

        {(!shift || shift.status !== 'open') && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-zinc-200 w-full max-w-xs">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-[#480489]" />
              </div>
              <h3 className="text-lg font-bold text-zinc-800 mb-2">Caja Cerrada</h3>
              <p className="text-sm text-zinc-500 mb-6">
                Para realizar ventas, es necesario abrir turno.
              </p>

              {can('cash_register:open') && (
                <OpenShiftModal trigger={
                  <Button className="w-full bg-[#480489] hover:bg-[#360368]">
                    Abrir Caja
                  </Button>
                } />
              )}
            </div>
          </div>
        )}

        <div className={`flex items-center px-2 pt-2 gap-1 overflow-x-auto border-b ${(!shift || shift.status !== 'open') ? 'opacity-50 pointer-events-none' : ''}`}>
          {['Ticket 1', 'Ticket 2', 'Ticket 3'].map((t) => (
            <div
              key={t}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer flex items-center gap-2 ${activeTicket === t.toLowerCase().replace(' ', '-') ? 'bg-purple-50 text-[#480489] border-b-2 border-[#480489]' : 'text-zinc-500 hover:bg-zinc-50'}`}
              onClick={() => setActiveTicket(t.toLowerCase().replace(' ', '-'))}
            >
              {t}
              <X className="w-3 h-3 hover:text-red-500" />
            </div>
          ))}
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 rounded-full text-[#480489] hover:bg-purple-50">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Barcode Input */}
        <div className={`p-3 border-b ${(!shift || shift.status !== 'open') ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Escanear código de barras..." className="pl-9" />
          </div>
        </div>

        {/* Cart Items List */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${(!shift || shift.status !== 'open') ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Empty State / Placeholder */}
          <div className="border border-dashed rounded-lg h-32 flex items-center justify-center text-sm text-muted-foreground">
            Zona de Artículos
          </div>
        </div>

        {/* Total & Actions */}
        <div className="p-4 border-t bg-zinc-50 space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-lg font-bold">Total:</span>
            <span className="text-3xl font-extrabold text-[#480489]">$0.00</span>
          </div>

          <Button
            className="w-full bg-[#480489] hover:bg-[#360368] h-12 text-lg"
            disabled={!shift || shift.status !== 'open'}
          >
            <Wallet className="w-5 h-5 mr-2" />
            {(!shift || shift.status !== 'open') ? 'Caja Cerrada' : 'Cobrar'}
          </Button>
        </div>
      </div>

    </div>
  );
}
