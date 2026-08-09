import "dotenv/config";
import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get("/api/health", (req, res) => res.send({ status: "ok" }));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
