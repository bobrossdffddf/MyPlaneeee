import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertServiceRequestSchema } from "@shared/schema";
import type { Airport } from "@shared/schema";
import { z } from "zod";

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAirport: string;
  airports: Airport[];
}

const formSchema = insertServiceRequestSchema.extend({
  airportIcao: z.string().min(1, "Airport is required"),
  serviceType: z.string().min(1, "Service type is required"),
  gate: z.string().min(1, "Gate is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  description: z.string().min(1, "Description is required"),
});

type FormData = z.infer<typeof formSchema>;

const serviceTypes = [
  // Essential Ground Services
  { value: "fuel", label: "Fuel Service", icon: "⛽", category: "Fueling" },
  { value: "fuel_full_service", label: "Full Service Fueling", icon: "🚛", category: "Fueling" },
  { value: "gpu_connection", label: "GPU Connection", icon: "🔌", category: "Power" },
  { value: "apu_connection", label: "APU Connection", icon: "⚡", category: "Power" },
  { value: "air_conditioning_ground", label: "Ground A/C", icon: "❄️", category: "Climate" },
  
  // Baggage & Cargo
  { value: "baggage_loading", label: "Baggage Loading", icon: "🧳", category: "Baggage" },
  { value: "baggage_unloading", label: "Baggage Unloading", icon: "📤", category: "Baggage" },
  { value: "cargo_loading", label: "Cargo Loading", icon: "📦", category: "Cargo" },
  { value: "cargo_unloading", label: "Cargo Unloading", icon: "📤", category: "Cargo" },
  { value: "special_cargo_handling", label: "Special Cargo", icon: "📦", category: "Cargo" },
  { value: "dangerous_goods_handling", label: "Dangerous Goods", icon: "⚠️", category: "Cargo" },
  
  // Catering Services
  { value: "catering_full_service", label: "Full Service Catering", icon: "🍽️", category: "Catering" },
  { value: "catering_beverage_only", label: "Beverage Service", icon: "☕", category: "Catering" },
  { value: "catering_meal_service", label: "Meal Service", icon: "🍲", category: "Catering" },
  
  // Maintenance & Inspections
  { value: "maintenance_line", label: "Line Maintenance", icon: "🔧", category: "Maintenance" },
  { value: "maintenance_heavy", label: "Heavy Maintenance", icon: "🔨", category: "Maintenance" },
  { value: "maintenance_inspection", label: "Maintenance Inspection", icon: "🔍", category: "Maintenance" },
  { value: "pre_flight_inspection", label: "Pre-flight Inspection", icon: "✅", category: "Inspections" },
  { value: "post_flight_inspection", label: "Post-flight Inspection", icon: "📋", category: "Inspections" },
  { value: "walk_around_inspection", label: "Walk-around Check", icon: "👀", category: "Inspections" },
  
  // Cleaning Services
  { value: "cleaning_cabin_full", label: "Full Cabin Cleaning", icon: "🧽", category: "Cleaning" },
  { value: "cleaning_cabin_light", label: "Light Cabin Cleaning", icon: "✨", category: "Cleaning" },
  { value: "cleaning_exterior", label: "Exterior Wash", icon: "💦", category: "Cleaning" },
  
  // Ground Operations
  { value: "pushback", label: "Pushback", icon: "🚛", category: "Ground Ops" },
  { value: "pushback_with_start", label: "Pushback with Start", icon: "🚀", category: "Ground Ops" },
  { value: "towing_to_gate", label: "Towing to Gate", icon: "🔗", category: "Ground Ops" },
  { value: "towing_to_maintenance", label: "Towing to Maintenance", icon: "🔗", category: "Ground Ops" },
  { value: "marshalling_arrival", label: "Arrival Marshalling", icon: "👋", category: "Ground Ops" },
  { value: "marshalling_departure", label: "Departure Marshalling", icon: "👋", category: "Ground Ops" },
  { value: "aircraft_parking_overnight", label: "Overnight Parking", icon: "🅿️", category: "Ground Ops" },
  { value: "aircraft_parking_transit", label: "Transit Parking", icon: "🔄", category: "Ground Ops" },
  
  // Passenger Services
  { value: "passenger_boarding", label: "Passenger Boarding", icon: "👥", category: "Passengers" },
  { value: "passenger_deboarding", label: "Passenger Deboarding", icon: "👤", category: "Passengers" },
  { value: "passenger_special_assistance", label: "Special Assistance", icon: "♿", category: "Passengers" },
  { value: "wheelchair_assistance", label: "Wheelchair Assistance", icon: "♿", category: "Passengers" },
  
  // Weather Services
  { value: "de_icing", label: "De-icing", icon: "❄️", category: "Weather" },
  { value: "anti_icing", label: "Anti-icing", icon: "🧊", category: "Weather" },
  
  // Utilities & Services
  { value: "lavatory_service", label: "Lavatory Service", icon: "🚽", category: "Utilities" },
  { value: "water_service_potable", label: "Potable Water", icon: "💧", category: "Utilities" },
  { value: "water_service_gray", label: "Gray Water Service", icon: "💨", category: "Utilities" },
  
  // Ground Equipment
  { value: "stairs_positioning", label: "Stairs Positioning", icon: "🪜", category: "Equipment" },
  { value: "stairs_removal", label: "Stairs Removal", icon: "📤", category: "Equipment" },
  { value: "jetbridge_connection", label: "Jetbridge Connection", icon: "🌉", category: "Equipment" },
  { value: "jetbridge_disconnection", label: "Jetbridge Disconnect", icon: "🔌", category: "Equipment" },
];

export default function NewRequestDialog({
  open,
  onOpenChange,
  selectedAirport,
  airports,
}: NewRequestDialogProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      airportIcao: selectedAirport,
      serviceType: "",
      gate: "",
      flightNumber: "",
      aircraft: "",
      description: "",
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Submitting form data:", data);
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create request");
      }
      
      return await response.json();
    },
    onSuccess: (result) => {
      console.log("SUCCESS! Request created:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "Success!",
        description: "Your service request has been created successfully!",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("FORM ERROR:", error);
      toast({
        title: "Error",
        description: "Failed to create request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("FORM SUBMIT CALLED!", data);
    console.log("Form errors:", form.formState.errors);
    createRequestMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Service Request</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="airportIcao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Airport</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-new-request-airport">
                        <SelectValue placeholder="Select airport" />
                      </SelectTrigger>
                      <SelectContent>
                        {airports.map((airport) => (
                          <SelectItem key={airport.icao} value={airport.icao}>
                            {airport.icao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-service-type">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {Object.entries(
                          serviceTypes.reduce((acc, service) => {
                            if (!acc[service.category]) acc[service.category] = [];
                            acc[service.category].push(service);
                            return acc;
                          }, {} as Record<string, typeof serviceTypes>)
                        ).map(([category, services]) => (
                          <div key={category}>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                              {category}
                            </div>
                            {services.map((service) => (
                              <SelectItem key={service.value} value={service.value}>
                                <span className="flex items-center space-x-2">
                                  <span>{service.icon}</span>
                                  <span>{service.label}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gate</FormLabel>
                    <FormControl>
                      <Input placeholder="A12" {...field} data-testid="input-gate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="flightNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flight Number</FormLabel>
                    <FormControl>
                      <Input placeholder="UA2847" {...field} data-testid="input-flight-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="aircraft"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aircraft Type (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Boeing 737-800" {...field} value={field.value || ""} data-testid="input-aircraft" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the service request details..."
                      className="min-h-20"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-request"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                disabled={createRequestMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-submit-request"
                onClick={() => {
                  console.log("BUTTON CLICKED!");
                  const formData = form.getValues();
                  console.log("Form data:", formData);
                  
                  // Validate required fields
                  if (!formData.airportIcao || !formData.serviceType || !formData.gate || !formData.flightNumber || !formData.description) {
                    toast({
                      title: "Missing Fields",
                      description: "Please fill out all required fields.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  createRequestMutation.mutate(formData);
                }}
              >
                {createRequestMutation.isPending ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
