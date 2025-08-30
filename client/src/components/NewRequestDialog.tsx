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
  { value: "fuel", label: "Fuel Service", icon: "⛽", category: "Fueling" },
  { value: "baggage_loading", label: "Baggage Loading", icon: "🧳", category: "Baggage" },
  { value: "baggage_unloading", label: "Baggage Unloading", icon: "📤", category: "Baggage" },
  { value: "catering", label: "Catering Service", icon: "🍽️", category: "Catering" },
  { value: "maintenance", label: "Aircraft Maintenance", icon: "🔧", category: "Maintenance" },
  { value: "cleaning_cabin", label: "Cabin Cleaning", icon: "🧽", category: "Cleaning" },
  { value: "cleaning_exterior", label: "Exterior Cleaning", icon: "✨", category: "Cleaning" },
  { value: "pushback", label: "Pushback Service", icon: "🚛", category: "Ground Operations" },
  { value: "ground_power", label: "Ground Power", icon: "🔌", category: "Power & Utilities" },
  { value: "security_check", label: "Security Inspection", icon: "🔒", category: "Security" },
  { value: "cargo_loading", label: "Cargo Loading", icon: "📦", category: "Cargo" },
  { value: "cargo_unloading", label: "Cargo Unloading", icon: "📤", category: "Cargo" },
  { value: "passenger_boarding", label: "Passenger Boarding", icon: "👥", category: "Passenger Services" },
  { value: "passenger_deboarding", label: "Passenger Deboarding", icon: "👤", category: "Passenger Services" },
  { value: "de_icing", label: "De-icing", icon: "❄️", category: "Weather Services" },
  { value: "anti_icing", label: "Anti-icing", icon: "🧊", category: "Weather Services" },
  { value: "lavatory_service", label: "Lavatory Service", icon: "🚽", category: "Utilities" },
  { value: "water_service", label: "Water Service", icon: "💧", category: "Utilities" },
  { value: "stairs_positioning", label: "Stairs Positioning", icon: "🪜", category: "Ground Equipment" },
  { value: "stairs_removal", label: "Stairs Removal", icon: "📤", category: "Ground Equipment" },
  { value: "jetbridge_connection", label: "Jetbridge Connection", icon: "🌉", category: "Ground Equipment" },
  { value: "jetbridge_disconnection", label: "Jetbridge Disconnection", icon: "🔌", category: "Ground Equipment" },
  { value: "marshalling", label: "Aircraft Marshalling", icon: "🚦", category: "Ground Operations" },
  { value: "customs_inspection", label: "Customs Inspection", icon: "📋", category: "Inspections" },
  { value: "immigration_check", label: "Immigration Check", icon: "🛂", category: "Inspections" },
  { value: "ground_transport", label: "Ground Transport", icon: "🚌", category: "Transportation" },
  { value: "wheelchair_assistance", label: "Wheelchair Assistance", icon: "♿", category: "Special Assistance" },
  { value: "special_cargo", label: "Special Cargo Handling", icon: "📦", category: "Cargo" },
  { value: "dangerous_goods", label: "Dangerous Goods Handling", icon: "⚠️", category: "Cargo" },
  { value: "aircraft_towing", label: "Aircraft Towing", icon: "🔗", category: "Ground Operations" },
  { value: "engine_start", label: "Engine Start Assistance", icon: "🚀", category: "Technical Services" },
  { value: "pre_flight_inspection", label: "Pre-flight Inspection", icon: "✅", category: "Inspections" },
  { value: "post_flight_inspection", label: "Post-flight Inspection", icon: "📋", category: "Inspections" },
  { value: "tire_pressure_check", label: "Tire Pressure Check", icon: "🏁", category: "Technical Services" },
  { value: "oil_service", label: "Oil Service", icon: "🛢️", category: "Technical Services" },
  { value: "hydraulic_service", label: "Hydraulic Service", icon: "🔧", category: "Technical Services" },
  { value: "nitrogen_service", label: "Nitrogen Service", icon: "💨", category: "Technical Services" },
  { value: "oxygen_service", label: "Oxygen Service", icon: "🫁", category: "Technical Services" },
  { value: "air_conditioning", label: "Air Conditioning", icon: "🌡️", category: "Climate Control" },
  { value: "cabin_service", label: "Cabin Service", icon: "🛏️", category: "Cabin Services" },
  { value: "galley_service", label: "Galley Service", icon: "🍴", category: "Cabin Services" },
  { value: "emergency_equipment_check", label: "Emergency Equipment Check", icon: "🚨", category: "Safety" },
  { value: "cargo_documentation", label: "Cargo Documentation", icon: "📄", category: "Documentation" },
  { value: "weight_balance", label: "Weight & Balance", icon: "⚖️", category: "Technical Services" },
  { value: "flight_planning_support", label: "Flight Planning Support", icon: "🗺️", category: "Flight Operations" },
  { value: "meteorological_briefing", label: "Weather Briefing", icon: "🌤️", category: "Flight Operations" },
  { value: "crew_transport", label: "Crew Transport", icon: "👨‍✈️", category: "Transportation" },
  { value: "hotel_shuttle", label: "Hotel Shuttle", icon: "🏨", category: "Transportation" },
  { value: "aircraft_parking", label: "Aircraft Parking", icon: "🅿️", category: "Ground Operations" },
  { value: "hangar_service", label: "Hangar Service", icon: "🏢", category: "Facilities" },
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
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {serviceTypes.map((service) => (
                          <SelectItem key={service.value} value={service.value}>
                            <span className="flex items-center space-x-2">
                              <span>{service.icon}</span>
                              <span>{service.label}</span>
                            </span>
                          </SelectItem>
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
