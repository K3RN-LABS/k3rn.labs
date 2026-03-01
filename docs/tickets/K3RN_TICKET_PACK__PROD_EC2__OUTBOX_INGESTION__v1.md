# K3RN — TICKET PACK — PROD EC2 (Standalone) + Outbox Ingestion

Version: 1.0
Status: EXECUTION READY
Priority: CRITICAL
Owner: Backend Lead / DevOps

---

## OBJECTIF

Mettre K3RN en production sur AWS EC2 avec:

- Next.js standalone runtime
- TLS via AWS ALB + ACM
- Ingestion graphe avec garantie zéro perte via Outbox pattern

---

## TICKET A — NEXT.JS STANDALONE BUILD

### Modifier next.config.mjs

```js
export default {
  output: "standalone",
}
```

### Build

```bash
npm run build
```

### Résultat attendu

```
.next/standalone/
.next/static/
public/
```

---

## TICKET B — OUTBOX INGESTION SYSTEM

### Créer table Prisma

```prisma
model CardIngestionJob {
  id String @id @default(cuid())
  dossierId String
  messageId String
  payload Json
  status String @default("PENDING")
  attempts Int @default(0)
  nextRunAt DateTime @default(now())
  createdAt DateTime @default(now())
}
```

### Migration

```bash
npx prisma migrate dev -n add_card_ingestion_jobs
```

### Worker loop

Créer script:

```
scripts/ingestion-worker.ts
```

Pseudo‑code:

```ts
while(true){

 const jobs = prisma.cardIngestionJob.findMany({
  where:{status:"PENDING"},
  take:10
 })

 for(job of jobs){
   try{
     await ingest(job)
     mark DONE
   }catch{
     retry
   }
 }

 sleep(2000)

}
```

---

## TICKET C — EC2 DEPLOYMENT

### Installer Node

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install nodejs
```

### Copier standalone

```
scp -r .next/standalone ec2:/var/www/k3rn
```

### PM2

```bash
pm2 start server.js --name k3rn
pm2 save
```

---

## TICKET D — ALB + ACM

- créer ALB
- attacher certificat ACM
- target group → port 3000

---

## DONE CRITERIA

- https://k3rnlabs.com fonctionne
- ingestion jamais perdue
- worker actif
