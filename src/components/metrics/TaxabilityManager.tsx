import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Product, Service } from "@/models/types";
import {
  loadExemptProductIds,
  loadTaxableServiceIds,
  saveExemptProductIds,
  saveTaxableServiceIds,
} from "./taxUtils";

interface Props {
  products: Product[];
  services: Service[];
  onSaved: () => void;
  trigger: React.ReactNode;
}

const TaxabilityManager: React.FC<Props> = ({
  products,
  services,
  onSaved,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [exemptProducts, setExemptProducts] = useState<Set<string>>(new Set());
  const [taxableServices, setTaxableServices] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  React.useEffect(() => {
    if (open) {
      setExemptProducts(new Set(loadExemptProductIds()));
      setTaxableServices(new Set(loadTaxableServiceIds()));
      setSearch("");
    }
  }, [open]);

  const sellableProducts = useMemo(
    () =>
      products
        .filter((p) => p.forSale !== false)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );
  const activeServices = useMemo(
    () =>
      services
        .filter((s) => s.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [services]
  );

  const filtered = (items: { name: string }[]) =>
    search
      ? items.filter((i) =>
          i.name.toLowerCase().includes(search.toLowerCase())
        )
      : items;

  const toggleProduct = (id: string, taxable: boolean) => {
    setExemptProducts((prev) => {
      const next = new Set(prev);
      if (taxable) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleService = (id: string, taxable: boolean) => {
    setTaxableServices((prev) => {
      const next = new Set(prev);
      if (taxable) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSave = () => {
    saveExemptProductIds(Array.from(exemptProducts));
    saveTaxableServiceIds(Array.from(taxableServices));
    onSaved();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Taxability</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">
              Products ({sellableProducts.length})
            </TabsTrigger>
            <TabsTrigger value="services">
              Services ({activeServices.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            <p className="text-xs text-muted-foreground mb-2">
              Default: taxable. Toggle off to mark as exempt.
            </p>
            <div className="max-h-[400px] overflow-y-auto divide-y border rounded-md">
              {filtered(sellableProducts).map((p: any) => {
                const taxable = !exemptProducts.has(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-14 text-right">
                        {taxable ? "Taxable" : "Exempt"}
                      </span>
                      <Switch
                        checked={taxable}
                        onCheckedChange={(v) => toggleProduct(p.id, v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="services">
            <p className="text-xs text-muted-foreground mb-2">
              Default: exempt. Toggle on to mark as taxable.
            </p>
            <div className="max-h-[400px] overflow-y-auto divide-y border rounded-md">
              {filtered(activeServices).map((s: any) => {
                const taxable = taxableServices.has(s.id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-14 text-right">
                        {taxable ? "Taxable" : "Exempt"}
                      </span>
                      <Switch
                        checked={taxable}
                        onCheckedChange={(v) => toggleService(s.id, v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaxabilityManager;
