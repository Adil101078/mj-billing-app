import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings, useUpdateSettings } from "@/lib/hooks";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: settingsData, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [localSettings, setLocalSettings] = useState<any>(null);

  // Initialize local settings when data is loaded
  useEffect(() => {
    if (settingsData && !localSettings) {
      setLocalSettings(settingsData);
    }
  }, [settingsData, localSettings]);

  const currentSettings = localSettings || settingsData || {
    shopName: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
    logo: '',
    cgstRate: 0,
    sgstRate: 0,
    goldRate: 0,
    silverRate: 0,
    productTypes: []
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Logo size should be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalSettings({ ...currentSettings, logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLocalSettings({ ...currentSettings, logo: '' });
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(currentSettings);
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const addProductType = () => {
    setLocalSettings({
      ...currentSettings,
      productTypes: [
        ...currentSettings.productTypes,
        { name: '', ratePerTenGram: 0 }
      ]
    });
  };

  const updateProductType = (index: number, field: 'name' | 'ratePerTenGram', value: string | number) => {
    const updated = [...currentSettings.productTypes];
    updated[index] = { ...updated[index], [field]: value };
    setLocalSettings({ ...currentSettings, productTypes: updated });
  };

  const removeProductType = (index: number) => {
    const updated = currentSettings.productTypes.filter((_: any, i: number) => i !== index);
    setLocalSettings({ ...currentSettings, productTypes: updated });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your shop and billing settings</p>
      </div>

      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shop" data-testid="tab-shop">Shop Information</TabsTrigger>
          <TabsTrigger value="tax" data-testid="tab-tax">Tax Configuration</TabsTrigger>
          <TabsTrigger value="rates" data-testid="tab-rates">Metal Rates</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">Product Types</TabsTrigger>
        </TabsList>

        <TabsContent value="shop">
          <Card>
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
              <CardDescription>Update your shop details that appear on invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Shop Logo</Label>
                <div className="flex items-center gap-4">
                  {currentSettings.logo ? (
                    <div className="relative">
                      <img
                        src={currentSettings.logo}
                        alt="Shop Logo"
                        className="h-24 w-24 object-contain border border-border rounded"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 border-2 border-dashed border-border rounded flex items-center justify-center text-xs text-muted-foreground">
                      No Logo
                    </div>
                  )}
                  <div>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a logo (max 2MB, PNG/JPG)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopName">Shop Name</Label>
                <Input
                  id="shopName"
                  value={currentSettings.shopName}
                  onChange={(e) => setLocalSettings({ ...currentSettings, shopName: e.target.value })}
                  data-testid="input-shop-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={currentSettings.address}
                  onChange={(e) => setLocalSettings({ ...currentSettings, address: e.target.value })}
                  data-testid="input-shop-address"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={currentSettings.phone}
                    onChange={(e) => setLocalSettings({ ...currentSettings, phone: e.target.value })}
                    data-testid="input-shop-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={currentSettings.email}
                    onChange={(e) => setLocalSettings({ ...currentSettings, email: e.target.value })}
                    data-testid="input-shop-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={currentSettings.gstNumber}
                  onChange={(e) => setLocalSettings({ ...currentSettings, gstNumber: e.target.value })}
                  data-testid="input-shop-gst"
                />
              </div>

              <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-shop">
                <Save className="mr-2 h-4 w-4" />
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle>Tax Configuration</CardTitle>
              <CardDescription>Set CGST and SGST rates for invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cgst">CGST Rate (%)</Label>
                  <Input
                    id="cgst"
                    type="number"
                    step="0.1"
                    value={currentSettings.cgstRate}
                    onChange={(e) => setLocalSettings({ ...currentSettings, cgstRate: parseFloat(e.target.value) || 0 })}
                    data-testid="input-cgst-rate"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sgst">SGST Rate (%)</Label>
                  <Input
                    id="sgst"
                    type="number"
                    step="0.1"
                    value={currentSettings.sgstRate}
                    onChange={(e) => setLocalSettings({ ...currentSettings, sgstRate: parseFloat(e.target.value) || 0 })}
                    data-testid="input-sgst-rate"
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-tax">
                <Save className="mr-2 h-4 w-4" />
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle>Current Metal Rates</CardTitle>
              <CardDescription>Update current gold and silver rates per 10 grams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="goldRate">Gold Rate (per 10g)</Label>
                  <Input
                    id="goldRate"
                    type="number"
                    value={currentSettings.goldRate}
                    onChange={(e) => setLocalSettings({ ...currentSettings, goldRate: parseFloat(e.target.value) || 0 })}
                    data-testid="input-gold-rate"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="silverRate">Silver Rate (per 10g)</Label>
                  <Input
                    id="silverRate"
                    type="number"
                    value={currentSettings.silverRate}
                    onChange={(e) => setLocalSettings({ ...currentSettings, silverRate: parseFloat(e.target.value) || 0 })}
                    data-testid="input-silver-rate"
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-rates">
                <Save className="mr-2 h-4 w-4" />
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Product Types</CardTitle>
                <CardDescription>Manage product types and their rates</CardDescription>
              </div>
              <Button onClick={addProductType} size="sm" data-testid="button-add-product-type">
                <Plus className="h-4 w-4 mr-1" />
                Add Type
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentSettings.productTypes.map((type: any, index: number) => (
                <div
                  key={index}
                  className="flex items-end gap-4"
                  data-testid={`product-type-${index}`}
                >
                  <div className="flex-1 space-y-2">
                    <Label>Type Name</Label>
                    <Input
                      value={type.name}
                      onChange={(e) => updateProductType(index, 'name', e.target.value)}
                      placeholder="e.g., Gold 24K"
                      data-testid={`input-product-name-${index}`}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Rate per 10g (₹)</Label>
                    <Input
                      type="number"
                      value={type.ratePerTenGram}
                      onChange={(e) => updateProductType(index, 'ratePerTenGram', parseFloat(e.target.value) || 0)}
                      data-testid={`input-product-rate-${index}`}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeProductType(index)}
                    data-testid={`button-remove-product-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button onClick={handleSave} disabled={updateSettings.isPending} className="mt-4" data-testid="button-save-products">
                <Save className="mr-2 h-4 w-4" />
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
