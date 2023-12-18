import express from "express";
const app = express();
const port = 5173;

app.use(express.static('build'));

app.listen(port, () => {
    console.log(`[http server geactiveerd] (poort ${port})`)
})