"use client";

import { useState } from "react";
import { Button } from "@/app/components/shared/ui/button";
import { Input } from "@/app/components/shared/ui/input";
import { Label } from "@/app/components/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/app/components/shared/ui/dialog";
import { Textarea } from "@/app/components/shared/ui/textarea";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { RozetkaTTNFormData } from "@/app/types/rozetka";
import { RozetkaCarrier } from "@/app/types/rozetka";
import { calculateVolume } from "@/app/lib/services/rozetka-delivery";
import { createRozetkaTTNFromOrder } from "@/app/[locale]/orders/actions/rozetka-delivery";
import { Alert, AlertDescription } from "@/app/components/shared/ui/alert";

interface RozetkaTTNModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  rozetkaOrderId: number;
  orderAmount: number;
  onTtnCreated?: (ttnNumber: string, ttnData: Record<string, unknown>) => void;
}

export function RozetkaTTNModal({
  open,
  onOpenChange,
  orderId,
  rozetkaOrderId,
  orderAmount,
  onTtnCreated,
}: RozetkaTTNModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<RozetkaTTNFormData>({
    // Package details
    weight: 1,
    length: 30,
    width: 20,
    height: 10,
    description: "",

    // Sender details (default values - should be configured in settings)
    senderType: "legal",
    senderCity: "Київ",
    senderAddress: "",
    senderDepartment: "",
    senderName: "",
    senderPhones: ["+380"],
    senderInfo: "",

    // Payment details
    hasPaid: false,
    codAmount: orderAmount,
    carrier: RozetkaCarrier.RozetkaDelivery,

    // Optional fields
    departureTime: "12:00",
    returnOperations: "",
  });

  const handleInputChange = (
    field: keyof RozetkaTTNFormData,
    value: string | number | boolean | string[] | "legal" | "individual"
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...formData.senderPhones];
    newPhones[index] = value;
    handleInputChange("senderPhones", newPhones);
  };

  const addPhone = () => {
    handleInputChange("senderPhones", [...formData.senderPhones, "+380"]);
  };

  const removePhone = (index: number) => {
    const newPhones = formData.senderPhones.filter((_, i) => i !== index);
    handleInputChange("senderPhones", newPhones);
  };

  const calculatedVolume = calculateVolume(
    formData.length,
    formData.width,
    formData.height
  );

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      const result = await createRozetkaTTNFromOrder(
        orderId,
        rozetkaOrderId,
        formData
      );

      if (!result.success) {
        toast.error(result.error || "Failed to create TTN");
        return;
      }

      toast.success(`TTN created successfully: ${result.data?.ttn}`);

      if (onTtnCreated && result.data) {
        onTtnCreated(result.data.ttn, result.data);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating TTN:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Створити ТТН Rozetka</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Заповніть дані для створення транспортної накладної Rozetka Delivery
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Package Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Параметри відправлення</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Вага (кг) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", Number.parseFloat(e.target.value))}
                  className="mt-1"
                />
                {errors.weight && (
                  <p className="text-sm text-red-500 mt-1">{errors.weight}</p>
                )}
              </div>

              <div>
                <Label htmlFor="length">Довжина (см) *</Label>
                <Input
                  id="length"
                  type="number"
                  value={formData.length}
                  onChange={(e) => handleInputChange("length", Number.parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="width">Ширина (см) *</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.width}
                  onChange={(e) => handleInputChange("width", Number.parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="height">Висота (см) *</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange("height", Number.parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Об&apos;єм: {calculatedVolume} м³
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="description">Опис відправлення</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Максимум 100 символів"
                maxLength={100}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Sender Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Дані відправника</h3>

            <div>
              <Label htmlFor="senderType">Тип відправника *</Label>
              <Select
                value={formData.senderType}
                onValueChange={(value: "legal" | "individual") =>
                  handleInputChange("senderType", value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legal">Юридична особа</SelectItem>
                  <SelectItem value="individual">Фізична особа</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="senderCity">Місто *</Label>
                <Input
                  id="senderCity"
                  value={formData.senderCity}
                  onChange={(e) => handleInputChange("senderCity", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="senderName">Назва / ПІБ *</Label>
                <Input
                  id="senderName"
                  value={formData.senderName}
                  onChange={(e) => handleInputChange("senderName", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="senderAddress">Адреса *</Label>
              <Input
                id="senderAddress"
                value={formData.senderAddress}
                onChange={(e) => handleInputChange("senderAddress", e.target.value)}
                placeholder="Повна адреса відправника"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="senderDepartment">UUID відділення *</Label>
              <Input
                id="senderDepartment"
                value={formData.senderDepartment}
                onChange={(e) => handleInputChange("senderDepartment", e.target.value)}
                placeholder="UUID відділення Rozetka"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Телефони *</Label>
              {formData.senderPhones.map((phone, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <Input
                    value={phone}
                    onChange={(e) => handlePhoneChange(index, e.target.value)}
                    placeholder="+380XXXXXXXXX"
                  />
                  {formData.senderPhones.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removePhone(index)}
                    >
                      Видалити
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addPhone}
                className="mt-2"
              >
                Додати телефон
              </Button>
            </div>

            <div>
              <Label htmlFor="senderInfo">Додаткова інформація</Label>
              <Input
                id="senderInfo"
                value={formData.senderInfo}
                onChange={(e) => handleInputChange("senderInfo", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Оплата</h3>

            <div>
              <Label htmlFor="hasPaid">Статус оплати *</Label>
              <Select
                value={formData.hasPaid.toString()}
                onValueChange={(value) => {
                  const isPaid = value === "true";
                  handleInputChange("hasPaid", isPaid);
                  if (isPaid) {
                    handleInputChange("codAmount", 0);
                  } else {
                    handleInputChange("codAmount", orderAmount);
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Повністю оплачено</SelectItem>
                  <SelectItem value="false">Накладений платіж</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!formData.hasPaid && (
              <div>
                <Label htmlFor="codAmount">Сума накладеного платежу (грн) *</Label>
                <Input
                  id="codAmount"
                  type="number"
                  step="0.01"
                  value={formData.codAmount}
                  onChange={(e) => handleInputChange("codAmount", Number.parseFloat(e.target.value))}
                  max={orderAmount}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Сума замовлення: {orderAmount} грн
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="carrier">Перевізник *</Label>
              <Select
                value={formData.carrier.toString()}
                onValueChange={(value) =>
                  handleInputChange("carrier", Number.parseInt(value))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">ROZETKA Delivery</SelectItem>
                  <SelectItem value="4">Meest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Створити ТТН
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
