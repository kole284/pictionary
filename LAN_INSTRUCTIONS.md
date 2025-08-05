# 🎮 Pictionary LAN Multiplayer - Instrukcije

## 🌐 Kako pokrenuti LAN igru

### 1. Priprema servera (Host)

1. **Instaliraj sve zavisnosti:**
   ```bash
   npm run install-all
   ```

2. **Pokreni server:**
   ```bash
   npm run lan
   ```
   ili za development sa auto-reload:
   ```bash
   npm run lan-dev
   ```

3. **Pronađi svoju IP adresu:**
   - **Linux/Mac:** `ifconfig` ili `ip addr`
   - **Windows:** `ipconfig`
   
   Traži liniju koja počinje sa `inet` (Linux/Mac) ili `IPv4` (Windows)

### 2. Povezivanje igrača

1. **Host (server):**
   - Otvori browser i idi na: `http://localhost:5000`

2. **Ostali igrači:**
   - Otvori browser i idi na: `http://[HOST_IP]:5000`
   - Zameni `[HOST_IP]` sa IP adresom host računara
   
   **Primer:** `http://192.168.1.100:5000`

### 3. Igra

1. **Host pokreće igru:**
   - Unesi svoje ime i klikni "Join Game"
   - Klikni "Start Game" kada se svi igrači prijave

2. **Ostali igrači:**
   - Unesi svoje ime i klikni "Join Game"
   - Sačekaj da host pokrene igru

## 🔧 Troubleshooting

### Problem: Igrači se ne mogu povezati
- Proveri da li su svi na istoj WiFi mreži
- Proveri da li firewall blokira port 5000
- Proveri da li je server pokrenut sa `0.0.0.0` (što je već podešeno)

### Problem: Server se ne pokreće
- Proveri da li je port 5000 slobodan
- Pokušaj sa drugim portom menjanjem `PORT` varijable u `server/index.js`

### Problem: CORS greške
- Server je već podešen da prihvata konekcije sa bilo koje IP adrese
- Ako i dalje imaš problema, proveri browser konzolu za detalje

## 📱 Podržani uređaji

- Desktop računari (Windows, Mac, Linux)
- Tableti
- Mobilni telefoni (preko browsera)

## 🎯 Preporučeno

- Koristi Chrome, Firefox ili Safari
- Osiguraj stabilnu WiFi konekciju
- Igraj u istoj prostoriji za bolje iskustvo

## 🚀 Brzi start

```bash
# 1. Instaliraj sve
npm run install-all

# 2. Pokreni server
npm run lan

# 3. Otvori http://localhost:5000 (host)
# 4. Ostali igrači: http://[YOUR_IP]:5000
```

Srećno sa igrom! 🎨 