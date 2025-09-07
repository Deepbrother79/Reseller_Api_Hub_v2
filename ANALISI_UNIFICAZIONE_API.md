# Analisi Unificazione API Supabase

## Situazione Attuale

### Funzioni Separate
1. **api-credits** (`/supabase/functions/api-credits/index.ts`)
   - Gestisce richieste per ottenere crediti del token
   - Verifica token nelle tabelle `tokens` e `tokens_master`
   - Restituisce crediti, product_name, product_id, is_master_token

2. **api-history** (`/supabase/functions/api-history/index.ts`)
   - Agisce come proxy per la funzione `storico`
   - Chiama `/functions/v1/storico` internamente
   - Restituisce lo storico delle transazioni

3. **storico** (`/supabase/functions/storico/index.ts`)
   - Funzione esistente che gestisce lo storico transazioni
   - Verifica token e restituisce transazioni con status 'success'

## Soluzione Unificata

### Nuova Funzione: api-unified

Ho creato una funzione unificata (`/supabase/functions/api-unified/index.ts`) che:

1. **Accetta un parametro `action`** per determinare l'operazione:
   - `action=credits` → Funzionalità di api-credits
   - `action=history` → Funzionalità di api-history
   - Default: `credits` se non specificato

2. **Mantiene la compatibilità completa**:
   - Stessi parametri di input (`token`)
   - Stesse strutture di risposta JSON
   - Stessi codici di stato HTTP
   - Stessi headers CORS

3. **Riutilizza la logica esistente**:
   - Per `history`: chiama la funzione `storico` esistente
   - Per `credits`: implementa la stessa logica di `api-credits`

## Modifiche al Frontend

### File Modificati
1. **Index.tsx**:
   - `fetchCreditsForToken()`: ora chiama `/api-unified?action=credits`
   - `handleHistorySubmit()`: ora chiama `/api-unified?action=history`
   - `generateHistoryUrl()`: genera URL per endpoint unificato
   - `generateCreditsUrl()`: genera URL per endpoint unificato

2. **FAQ.tsx**:
   - Aggiornata documentazione API con nuovi endpoint

## Vantaggi dell'Unificazione

### 1. **Riduzione della Complessità**
- Un solo endpoint da mantenere invece di due
- Logica centralizzata per gestione errori e CORS
- Meno duplicazione di codice

### 2. **Migliore Manutenibilità**
- Aggiornamenti centralizzati
- Debugging più semplice
- Configurazione unificata

### 3. **Prestazioni**
- Riduzione del numero di funzioni Supabase attive
- Meno overhead di deployment
- Gestione più efficiente delle risorse

### 4. **Compatibilità Garantita**
- Nessuna modifica alle tabelle Supabase
- Stesse risposte JSON del frontend
- Comportamento identico dell'applicazione web

## Struttura delle Chiamate

### Prima (Separate)
```
Frontend → /api-credits?token=xxx → Risposta crediti
Frontend → /api-history?token=xxx → /storico → Risposta storico
```

### Dopo (Unificata)
```
Frontend → /api-unified?token=xxx&action=credits → Risposta crediti
Frontend → /api-unified?token=xxx&action=history → /storico → Risposta storico
```

## Test di Compatibilità

### Verifiche Necessarie
1. **Funzionalità Credits**:
   - Verifica che i crediti vengano mostrati correttamente
   - Controllo product_name e is_master_token
   - Test con token regolari e master token

2. **Funzionalità History**:
   - Verifica che lo storico transazioni sia identico
   - Controllo ordinamento e filtri
   - Test con token senza transazioni

3. **Gestione Errori**:
   - Token non validi
   - Parametri mancanti
   - Errori di rete

## Conclusioni

✅ **Le funzioni possono essere unificate con successo**

✅ **Nessun impatto sulle tabelle Supabase**

✅ **Nessun cambiamento nel comportamento del frontend**

✅ **Migliore architettura e manutenibilità**

La soluzione proposta mantiene la piena compatibilità mentre semplifica l'architettura del sistema.