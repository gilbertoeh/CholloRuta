
// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import * as L from 'leaflet';

/**
 * Representa un tipo de combustible en una gasolinera concreta.
 */
interface TipoCombustible {
  nombre: string;  // p.e. "Gasolina 95 E5"
  precio: number;
}

/**
 * Datos básicos de una gasolinera.
 */
interface Gasolinera {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  empresa: string;
  combustibles: TipoCombustible[];
  horario: string;
}

/**
 * Para manejar la lista de "5 más cercanas",
 * creamos un objeto que asocia la gasolinera con su distancia (en km).
 */
interface GasolineraConDistancia {
  gasolinera: Gasolinera;
  distancia: number;
}

/**
 * Para manejar la lista de "5 combustibles más baratos",
 * necesitamos saber la distancia a la gasolinera, 
 * y también qué combustible es y cuál es su precio.
 */
interface CombustibleEnGasolinera {
  gasolinera: Gasolinera;
  distancia: number;
  nombreComb: string;
  precioComb: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'CholloRuta';

  // Ubicación del usuario por IP
  userLocation: { lat: number; lon: number } | null = null;

  // Datos "mock" locales
  private gasolinerasMock: Gasolinera[] = [
    {
      id: 'G1',
      nombre: 'Gasolinera Alcampo',
      latitud: 39.5340,
      longitud: -0.4170,
      empresa: 'ALCAMPO',
      horario: 'L-D: 24h',
      combustibles: [
        { nombre: 'Gasolina 95 E5', precio: 1.459 },
        { nombre: 'Gasolina 98 E5', precio: 1.579 },
        { nombre: 'Diesel A', precio: 1.399 }
      ]
    },
    {
      id: 'G2',
      nombre: 'Repsol Primado Reig',
      latitud: 39.4820,
      longitud: -0.3690,
      empresa: 'REPSOL',
      horario: 'L-D: 07:00-23:00',
      combustibles: [
        { nombre: 'Gasolina 95 E5', precio: 1.649 },
        { nombre: 'Diesel A', precio: 1.579 }
      ]
    },
    {
      id: 'G3',
      nombre: 'CEPSA Avenida',
      latitud: 39.5365,
      longitud: -0.4040,
      empresa: 'CEPSA',
      horario: 'L-D: 06:00-22:00',
      combustibles: [
        { nombre: 'Gasolina 95 E5', precio: 1.489 },
        { nombre: 'Diesel A', precio: 1.409 }
      ]
    },
    {
      id: 'G4',
      nombre: 'BALLENOIL Burjasot',
      latitud: 39.5201,
      longitud: -0.4191,
      empresa: 'BALLENOIL',
      horario: 'L-D: 24h',
      combustibles: [
        { nombre: 'Gasolina 95 E5', precio: 1.459 },
        { nombre: 'Diesel A', precio: 1.439 }
      ]
    },
    {
      id: 'G5',
      nombre: 'Galp Valencia Centro',
      latitud: 39.4700,
      longitud: -0.3765,
      empresa: 'GALP',
      horario: 'L-D: 06:00-22:00',
      combustibles: [
        { nombre: 'Gasolina 95 E5', precio: 1.599 },
        { nombre: 'Diesel A', precio: 1.529 }
      ]
    },
    {
      id: 'G6',
      nombre: 'Repsol Portal C',
      latitud: 39.4612,
      longitud: -0.3800,
      empresa: 'REPSOL',
      horario: 'L-D: 24h',
      combustibles: [
        { nombre: 'Gasolina 98 E5', precio: 1.689 },
        { nombre: 'Diesel A', precio: 1.529 }
      ]
    }
  ];

  // Filtros
  ratioBusqueda: number = 3; // km por defecto
  filterCarburante: string = '';

  // Listas resultantes
  gasolineras: Gasolinera[] = [];
  gasolinerasMasCercanas: GasolineraConDistancia[] = [];
  combustiblesMasBaratos: CombustibleEnGasolinera[] = [];

  // Mapa Leaflet
  map: L.Map | undefined;

  ngOnInit(): void {
    // 1) Obtenemos la ubicación IP
    this.obtenerUbicacionUsuario().then(() => {
      // 2) Cargamos la lista local
      this.gasolineras = this.gasolinerasMock;
      // 3) Por defecto, calculamos las 5 más cercanas
      this.calcularGasolinerasMasCercanas();
    });
  }

  /**
   * Llamada a ip-api.com para detección de ubicación
   */
  async obtenerUbicacionUsuario(): Promise<void> {
    try {
      const resp = await fetch('http://ip-api.com/json/');
      const data = await resp.json();
      this.userLocation = { lat: data.lat, lon: data.lon };
      console.log('Ubicación IP:', this.userLocation);
    } catch (error) {
      console.warn('No se pudo obtener IP, usando Valencia');
      this.userLocation = { lat: 39.4676, lon: -0.3771 };
    }
  }

  // =========================================================
  // =========== 1) Mostrar las 5 gasolineras más cercanas ===
  // =========================================================
  calcularGasolinerasMasCercanas(): void {
    if (!this.userLocation || this.gasolineras.length === 0) {
      this.gasolinerasMasCercanas = [];
      return;
    }

    // 1) Calculamos la distancia
    const gasConDist = this.gasolineras.map(g => {
      const dist = this.calcularDistancia(
        this.userLocation!.lat,
        this.userLocation!.lon,
        g.latitud,
        g.longitud
      );
      return { gasolinera: g, distancia: dist };
    });

    // 2) Filtramos por ratio
    let filtradas = gasConDist.filter(item => item.distancia <= this.ratioBusqueda);

    // 3) Ordenamos por distancia asc
    filtradas.sort((a, b) => a.distancia - b.distancia);

    // 4) Top 5
    filtradas = filtradas.slice(0, 5);

    // 5) Si hay un filterCarburante, solo guardamos las que tengan al menos un combustible que coincida
    if (this.filterCarburante) {
      const txt = this.filterCarburante.toLowerCase();
      filtradas = filtradas.filter(item =>
        item.gasolinera.combustibles.some(c => c.nombre.toLowerCase().includes(txt))
      );
    }

    this.gasolinerasMasCercanas = filtradas;
    // Borra la lista de combustibles mas baratos (para que no se muestre algo anterior)
    this.combustiblesMasBaratos = [];
  }

  // =========================================================
  // =========== 2) Mostrar 5 combustibles más baratos =======
  // =========================================================
  listarTop5CombustiblesMasBaratos(): void {
    if (!this.userLocation || this.gasolineras.length === 0) {
      this.combustiblesMasBaratos = [];
      return;
    }

    // 1) Calculamos la distancia a cada gasolinera
    const gasConDist = this.gasolineras.map(g => {
      const dist = this.calcularDistancia(
        this.userLocation!.lat,
        this.userLocation!.lon,
        g.latitud,
        g.longitud
      );
      return { gasolinera: g, distancia: dist };
    });

    // 2) Filtramos por ratio
    const filtradas = gasConDist.filter(item => item.distancia <= this.ratioBusqueda);

    // 3) Creamos un array de "CombustibleEnGasolinera"
    let allCombustibles: CombustibleEnGasolinera[] = [];
    filtradas.forEach(item => {
      const gas = item.gasolinera;
      const dist = item.distancia;
      gas.combustibles.forEach(c => {
        // si hay filterCarburante, lo comprobamos
        if (this.filterCarburante) {
          const txt = this.filterCarburante.toLowerCase();
          if (!c.nombre.toLowerCase().includes(txt)) {
            return; // si no coincide, skip
          }
        }
        // Añadimos a la lista
        allCombustibles.push({
          gasolinera: gas,
          distancia: dist,
          nombreComb: c.nombre,
          precioComb: c.precio
        });
      });
    });

    // 4) Ordenamos por precio ascending
    allCombustibles.sort((a, b) => a.precioComb - b.precioComb);

    // 5) Tomamos top 5
    this.combustiblesMasBaratos = allCombustibles.slice(0, 5);

    // Borra la lista de las mas cercanas, para no confundir la vista
    this.gasolinerasMasCercanas = [];
  }

  // =========================================================
  // =========== Cambios en filtros de Carburante  ===========
  // =========================================================
  onChangeFiltroCarburante(): void {
    // Si estamos viendo las "5 más cercanas", recalculamos
    if (this.gasolinerasMasCercanas.length > 0) {
      this.calcularGasolinerasMasCercanas();
    }
    // Si estamos viendo las "5 más baratas", recalculamos
    if (this.combustiblesMasBaratos.length > 0) {
      this.listarTop5CombustiblesMasBaratos();
    }
  }

  // =========================================================
  // =========== Ver ruta (gasolinera)  ======================
  // =========================================================
  verRutaGasolinera(g: Gasolinera): void {
    if (!this.userLocation) {
      alert('No se ha detectado tu ubicación');
      return;
    }

    // Renderizamos el mapa
    if (this.map) {
      this.map.remove();
    }
    const centerLat = (this.userLocation.lat + g.latitud) / 2;
    const centerLon = (this.userLocation.lon + g.longitud) / 2;

    this.map = L.map('map').setView([centerLat, centerLon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Marcadores
    L.marker([this.userLocation.lat, this.userLocation.lon])
      .addTo(this.map)
      .bindPopup('Tu ubicación')
      .openPopup();

    L.marker([g.latitud, g.longitud])
      .addTo(this.map)
      .bindPopup(g.nombre)
      .openPopup();

    // Ruta con OSRM
    this.trazarRutaOSRM(g);
  }

  async trazarRutaOSRM(g: Gasolinera): Promise<void> {
    if (!this.userLocation) return;

    const url = `http://router.project-osrm.org/route/v1/driving/` +
                `${this.userLocation.lon},${this.userLocation.lat};` +
                `${g.longitud},${g.latitud}?overview=full&geometries=geojson`;

    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry;
        const coords = route.coordinates.map((c: number[]) => [c[1], c[0]]);
        L.polyline(coords, { color: 'blue' }).addTo(this.map!);
      } else {
        console.error('No se encontró ruta en OSRM');
      }
    } catch (error) {
      console.error('Error OSRM route:', error);
    }
  }

  // =========================================================
  // =========== Distancia (haversine) =======================
  // =========================================================
  calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
