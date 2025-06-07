"use client"

import { useState } from "react"
import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Label } from "@/app/components/shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/shared/ui/dialog"
import { Textarea } from "@/app/components/shared/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Checkbox } from "@/app/components/shared/ui/checkbox"

interface Order {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string
  totalAmount: number
}

interface UkrPoshtaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
}

type Step = "sender" | "recipient" | "shipment" | "confirmation"

export function UkrPoshtaModal({ open, onOpenChange, order }: UkrPoshtaModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("sender")
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    // Sender details
    senderName: "",
    senderPhone: "",
    senderEmail: "",
    senderPostcode: "",
    senderRegion: "",
    senderDistrict: "",
    senderCity: "",
    senderStreet: "",
    senderHouseNumber: "",
    senderApartment: "",

    // Recipient details
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    recipientEmail: order.customerEmail,
    recipientPostcode: "",
    recipientRegion: "",
    recipientDistrict: "",
    recipientCity: "",
    recipientStreet: "",
    recipientHouseNumber: "",
    recipientApartment: "",

    // Shipment details
    deliveryType: "W2D", // W2D, W2W, D2W, D2D
    shipmentType: "STANDARD", // EXPRESS, STANDARD, DOCUMENT, CARGO
    weight: "",
    length: "",
    width: "",
    height: "",
    paidByRecipient: false,
    postPay: "",
    onFailReceiveType: "RETURN",
    description: "",
  })

  const steps = [
    { id: "sender", title: "Sender Details", description: "Enter sender information" },
    { id: "recipient", title: "Recipient Details", description: "Enter recipient information" },
    { id: "shipment", title: "Shipment Details", description: "Configure shipment parameters" },
    { id: "confirmation", title: "Confirmation", description: "Review and confirm" },
  ]

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep)

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id as Step)
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id as Step)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // TODO: Implement UkrPoshta API integration
      // 1. Create sender address
      // 2. Create recipient address
      // 3. Create sender client
      // 4. Create recipient client
      // 5. Create shipment
      // 6. Generate shipping label
      // 7. Update order with tracking information

      console.log("Creating UkrPoshta shipment with data:", formData)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create UkrPoshta shipment:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderSenderStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Sender Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="senderName">Full Name *</Label>
            <Input
              id="senderName"
              value={formData.senderName}
              onChange={(e) => setFormData((prev) => ({ ...prev, senderName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderPhone">Phone *</Label>
            <Input
              id="senderPhone"
              value={formData.senderPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, senderPhone: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="senderEmail">Email</Label>
          <Input
            id="senderEmail"
            type="email"
            value={formData.senderEmail}
            onChange={(e) => setFormData((prev) => ({ ...prev, senderEmail: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="senderPostcode">Postcode *</Label>
            <Input
              id="senderPostcode"
              value={formData.senderPostcode}
              onChange={(e) => setFormData((prev) => ({ ...prev, senderPostcode: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderRegion">Region *</Label>
            <Input
              id="senderRegion"
              value={formData.senderRegion}
              onChange={(e) => setFormData((prev) => ({ ...prev, senderRegion: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderDistrict">District</Label>
            <Input
              id="senderDistrict"
              value={formData.senderDistrict}
              onChange={(e) => setFormData((prev) => ({ ...prev, senderDistrict: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="senderCity">City *</Label>
            <Input
              id="senderCity"
              value={formData.senderCity}
              onChange={(e) => setFormData((prev) => ({ ...prev, senderCity: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderStreet">Street *</Label>
            <Input
              id="senderStreet"
              value={formData.senderStreet}
              onChange={(e) => setFormData((prev) => ({ ...prev, senderStreet: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="senderHouseNumber">House Number *</Label>
            <Input
              id="senderHouseNumber"
              value={formData.senderHouseNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, senderHouseNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderApartment">Apartment</Label>
            <Input
              id="senderApartment"
              value={formData.senderApartment}
              onChange={(e) => setFormData((prev) => ({ ...prev, senderApartment: e.target.value }))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderRecipientStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Recipient Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipientName">Full Name *</Label>
            <Input
              id="recipientName"
              value={formData.recipientName}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipientPhone">Phone *</Label>
            <Input
              id="recipientPhone"
              value={formData.recipientPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientPhone: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipientEmail">Email</Label>
          <Input
            id="recipientEmail"
            type="email"
            value={formData.recipientEmail}
            onChange={(e) => setFormData((prev) => ({ ...prev, recipientEmail: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipientPostcode">Postcode *</Label>
            <Input
              id="recipientPostcode"
              value={formData.recipientPostcode}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientPostcode: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipientRegion">Region *</Label>
            <Input
              id="recipientRegion"
              value={formData.recipientRegion}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientRegion: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipientDistrict">District</Label>
            <Input
              id="recipientDistrict"
              value={formData.recipientDistrict}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientDistrict: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipientCity">City *</Label>
            <Input
              id="recipientCity"
              value={formData.recipientCity}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientCity: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipientStreet">Street *</Label>
            <Input
              id="recipientStreet"
              value={formData.recipientStreet}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientStreet: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipientHouseNumber">House Number *</Label>
            <Input
              id="recipientHouseNumber"
              value={formData.recipientHouseNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientHouseNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipientApartment">Apartment</Label>
            <Input
              id="recipientApartment"
              value={formData.recipientApartment}
              onChange={(e) => setFormData((prev) => ({ ...prev, recipientApartment: e.target.value }))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderShipmentStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Shipment Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deliveryType">Delivery Type *</Label>
            <Select
              value={formData.deliveryType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, deliveryType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="W2D">Warehouse to Door</SelectItem>
                <SelectItem value="W2W">Warehouse to Warehouse</SelectItem>
                <SelectItem value="D2W">Door to Warehouse</SelectItem>
                <SelectItem value="D2D">Door to Door</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shipmentType">Shipment Type *</Label>
            <Select
              value={formData.shipmentType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, shipmentType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPRESS">Express</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="DOCUMENT">Document</SelectItem>
                <SelectItem value="CARGO">Cargo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg) *</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="length">Length (cm)</Label>
            <Input
              id="length"
              type="number"
              value={formData.length}
              onChange={(e) => setFormData((prev) => ({ ...prev, length: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (cm)</Label>
            <Input
              id="width"
              type="number"
              value={formData.width}
              onChange={(e) => setFormData((prev) => ({ ...prev, width: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              value={formData.height}
              onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="paidByRecipient"
              checked={formData.paidByRecipient}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, paidByRecipient: checked as boolean }))}
            />
            <Label htmlFor="paidByRecipient">Paid by recipient</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postPay">Post Pay Amount</Label>
            <Input
              id="postPay"
              type="number"
              step="0.01"
              value={formData.postPay}
              onChange={(e) => setFormData((prev) => ({ ...prev, postPay: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="onFailReceiveType">On Fail Receive Type</Label>
            <Select
              value={formData.onFailReceiveType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, onFailReceiveType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RETURN">Return to sender</SelectItem>
                <SelectItem value="STORAGE">Keep in storage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Package description..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderConfirmationStep = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Shipment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Sender</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{formData.senderName}</p>
                <p>{formData.senderPhone}</p>
                <p>
                  {formData.senderPostcode} {formData.senderCity}
                </p>
                <p>
                  {formData.senderStreet} {formData.senderHouseNumber}
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Recipient</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{formData.recipientName}</p>
                <p>{formData.recipientPhone}</p>
                <p>
                  {formData.recipientPostcode} {formData.recipientCity}
                </p>
                <p>
                  {formData.recipientStreet} {formData.recipientHouseNumber}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Shipment Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p>
                  {formData.deliveryType} - {formData.shipmentType}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Weight:</span>
                <p>{formData.weight} kg</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment:</span>
                <p>{formData.paidByRecipient ? "Recipient pays" : "Sender pays"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Post Pay:</span>
                <p>{formData.postPay || "None"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "sender":
        return renderSenderStep()
      case "recipient":
        return renderRecipientStep()
      case "shipment":
        return renderShipmentStep()
      case "confirmation":
        return renderConfirmationStep()
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate UkrPoshta Invoice</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  index <= currentStepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <div className="ml-2 hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    index <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 ${index < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div key={currentStep} className="min-h-[400px] animate-content-show">
          {renderCurrentStep()}
        </div>

        <DialogFooter className="flex justify-end items-center pt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              // Optional: Add reset logic similar to NovaPoshtaModal if needed
              // setTimeout(() => setCurrentStep("sender"), 300);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          {currentStepIndex > 0 && (
            <Button variant="outline" onClick={handlePrevious} disabled={loading || currentStepIndex === 0}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}
          {currentStep !== "confirmation" ? (
            <Button onClick={handleNext} disabled={loading}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Shipment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
