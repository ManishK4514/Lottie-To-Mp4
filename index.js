import express from "express";
import { downloadVideoFromLottie } from "./LottieToVideo.js";
import nike from './assets/nike.json' assert { type: "json" };

const app = express();
const port = 3000;

app.use(express.json());

app.post("/getVideoInMp4", async (req, res) => {
  console.log("Body Data: ", req.body);

  const { animationData } = req.body;
  
  if (!animationData) {
      return res.status(400).send("Invalid request. Missing 'animationData' in the request body.");
  }

  const encodedText = await downloadVideoFromLottie(nike);
  res.send(encodedText);
});

app.listen(port, () => {
    console.log(`Server is running at: ${port}`);
});
