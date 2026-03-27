// src/app/modules/admin/apps/covoiturage/user/covoiturage-user.component.ts
import { Component } from '@angular/core';

// Imports des icons
import {
  LucideMapPin,
  LucideClock,
  LucideUsers,
  LucideMessageCircle,
  LucideCheckCircle,
  LucideGift,
  LucideTrendingUp
} from '@lucide/angular';

@Component({
  selector: 'app-covoiturage-user',
  standalone: false,
  templateUrl: './covoiturage-user.component.html',
})
export class CovoiturageUserComponent {

  // Références des icons
  MapPin = LucideMapPin;
  Clock = LucideClock;
  Users = LucideUsers;
  MessageCircle = LucideMessageCircle;
  CheckCircle = LucideCheckCircle;
  Gift = LucideGift;
  TrendingUp = LucideTrendingUp;

  // Données
  carpoolOptions = [
    {
      id: 1,
      name: "Fatma Ben Ali",
      avatar: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90JTIwYnVzaW5lc3N8ZW58MXx8fHwxNzc0MTY5Mjk1fDA&ixlib=rb-4.1.0&q=80&w=200",
      departure: "Ariana",
      arrival: "Centre-ville Tunis",
      time: "08:00",
      seats: 3,
      reliable: true,
    },
    {
      id: 2,
      name: "Ahmed Mansour",
      avatar: "https://images.unsplash.com/photo-1629507208649-70919ca33793?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBidXNpbmVzcyUyMHBvcnRyYWl0fGVufDF8fHx8MTc3NDE1ODE0OHww&ixlib=rb-4.1.0&q=80&w=200",
      departure: "La Marsa",
      arrival: "Lac 2",
      time: "07:45",
      seats: 2,
      reliable: true,
    },
    {
      id: 3,
      name: "Mohamed Kacem",
      avatar: "https://images.unsplash.com/photo-1644269444230-c6d1f2722e10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjBlbXBsb3llZSUyMHBvcnRyYWl0JTIwbWFufGVufDF8fHx8MTc3NDE2OTI5Nnww&ixlib=rb-4.1.0&q=80&w=200",
      departure: "Ben Arous",
      arrival: "Centre-ville Tunis",
      time: "08:15",
      seats: 1,
      reliable: false,
    }
  ];

  days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  myUsedTransports = [
    {
      id: 1,
      type: "covoiturage",
      driver: "Fatma Ben Ali",
      avatar: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90JTIwYnVzaW5lc3N8ZW58MXx8fHwxNzc0MTY5Mjk1fDA&ixlib=rb-4.1.0&q=80&w=200",
      departure: "Ariana",
      arrival: "Centre-ville Tunis",
      time: "08:00",
      seats: 3,
      daysUsed: ["Lun", "Mar", "Mer", "Jeu", "Ven"]
    },
    {
      id: 2,
      type: "navette",
      name: "Navette Entreprise",
      departure: "Lac 1",
      arrival: "Lac 2",
      time: "07:30",
      daysUsed: ["Lun", "Ven"],
      driver: null,
      avatar: null
    }
  ];

  myProposedTransports = [
    {
      id: 1,
      driver: "Vous",
      departure: "Ben Arous",
      arrival: "Centre-ville Tunis",
      time: "07:45",
      seats: 2,
      bookedSeats: 1,
      daysActive: ["Lun", "Mar", "Mer", "Jeu", "Ven"],
      passengers: [
        {
          name: "Sarah Mansour",
          avatar: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90JTIwYnVzaW5lc3N8ZW58MXx8fHwxNzc0MTY5Mjk1fDA&ixlib=rb-4.1.0&q=80&w=200",
        },
      ],
    },
  ];

  // États
  selectedTab: string = 'covoiturage';
  selectedDays: string[] = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
  showChat = false;
  activeSection: 'utilises' | 'proposes' = 'utilises';
  showGiftModal = false;

  toggleDay(day: string) {
    if (this.selectedDays.includes(day)) {
      this.selectedDays = this.selectedDays.filter(d => d !== day);
    } else {
      this.selectedDays = [...this.selectedDays, day];
    }
  }

  toggleChat() {
    this.showChat = !this.showChat;
  }
}