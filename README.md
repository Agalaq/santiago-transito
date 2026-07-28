# Tránsito Santiago — Netlify

Web app estática con una Netlify Function que consulta TomTom Traffic API y muestra el estado de vías principales de Santiago.

## Incluye

- Mapa interactivo con Leaflet y OpenStreetMap.
- 15 corredores entre autopistas, avenidas y rutas.
- Velocidad actual, velocidad de flujo libre, demora y nivel de congestión.
- Actualización automática cada 60 segundos.
- API key protegida dentro de una Netlify Function.
- Modo demostración cuando todavía no existe una clave TomTom.
- Diseño adaptable a computador y celular.

## Despliegue rápido en Netlify

1. Descomprime esta carpeta.
2. Sube el proyecto a GitHub, GitLab o Bitbucket.
3. En Netlify selecciona **Add new project → Import an existing project**.
4. Selecciona el repositorio. Netlify leerá automáticamente `netlify.toml`:
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
5. Despliega el proyecto. En este punto funcionará en modo demostración.

## Activar datos reales

1. Crea una cuenta y una API key en TomTom Developer Portal.
2. En Netlify abre:
   **Project configuration → Environment variables**.
3. Agrega:

```text
TOMTOM_API_KEY=tu_clave_real
```

4. Asegúrate de que la variable esté disponible para **Functions**.
5. Ejecuta un nuevo deploy.

No pongas la clave dentro de `public/app.js`, `index.html` ni `netlify.toml`.

## Despliegue manual por arrastrar y soltar

El sitio usa Netlify Functions, por lo que no basta con arrastrar solamente la carpeta `public`. Para incluir la función se recomienda desplegar mediante un repositorio Git o Netlify CLI.

## Desarrollo local

Instala Netlify CLI:

```bash
npm install -g netlify-cli
```

Copia el archivo de variables:

```bash
cp .env.example .env
```

Agrega tu clave a `.env` y ejecuta:

```bash
netlify dev
```

Abre la dirección local indicada por Netlify CLI.

## Personalizar vías

Edita `CORRIDORS` en:

```text
netlify/functions/traffic.mjs
```

Cada corredor tiene un nombre, categoría y puntos de muestreo `[latitud, longitud]`. Conviene ubicar los puntos directamente sobre cada calzada y, cuando sea necesario, crear corredores separados por sentido.

## Consideraciones para producción

- La respuesta de la función utiliza caché CDN durante aproximadamente 55 segundos para evitar que cada visitante genere nuevas consultas a TomTom.
- Revisa los límites y precios de tu plan TomTom antes de aumentar la cantidad de corredores o puntos.
- El mapa base de OpenStreetMap es adecuado para prototipos y tráfico moderado. Para una aplicación pública de alto uso, utiliza un proveedor de tiles con un plan comercial y condiciones adecuadas.
- Los valores por corredor son promedios de varios segmentos cercanos. Para precisión operacional por sentido o enlace vial, separa cada dirección y agrega más puntos de muestreo.
