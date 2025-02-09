// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';  // <-- Sin provideApplicationConfig
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app/app.component';
// import { appConfig } from './app/app.config'; // <-- Comentar o eliminar

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(HttpClientModule),
    // provideApplicationConfig(appConfig) <-- Comentar o eliminar
  ],
}).catch((err) => console.error(err));
