import puppeteer from "puppeteer";
import { exec } from "child_process";
import fs from "fs";
import util from "util";

const readFile = util.promisify(fs.readFile);

export async function downloadVideoFromLottie(animationData) {
    console.log("converting to video");

    // Create a temporary HTML file
    const html = `
    <!DOCTYPE html>
    <html style="margin: 0; padding: 0;">
    <body style="margin: 0; padding: 0;">
    <div id="lottie"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.8/lottie.min.js"></script>
    <script>
    var animation = lottie.loadAnimation({
        container: document.getElementById('lottie'),
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData: ${JSON.stringify(animationData)}
    });
    window.animation = animation;
    </script>
    </body>
    </html>
    `;

    // Launch Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Load the HTML
    await page.setContent(html);

    // Get the total number of frames
    const totalFrames = await page.evaluate(() => window.animation.totalFrames);

    // Start FFmpeg as a child process
    const ffmpeg = exec(
        "ffmpeg -y -f image2pipe -r 30 -i - -c:v libx264 -vf fps=25 -pix_fmt yuv420p out.mp4"
    );

    // Loop over each frame
    for (let i = 0; i < 30; i++) {
        // Go to the current frame
        await page.evaluate(
            (frame) => window.animation.goToAndStop(frame, true),
            i
        );

        // Set the viewport size to the desired dimensions
        await page.setViewport({ width: 720, height: 1280 });

        // Wait for the SVG to render
        await page.waitForTimeout(0.1);

        // Take a screenshot of the current frame and pipe it into FFmpeg
        const screenshot = await page.screenshot({
            clip: { x: 0, y: 0, width: 720, height: 1280 },
        });
        ffmpeg.stdin.write(screenshot);
    }

    // End the FFmpeg input stream
    ffmpeg.stdin.end();

    // Close Puppeteer
    await browser.close();

    await new Promise((resolve, reject) => {
        ffmpeg.on('close', resolve);
        ffmpeg.on('error', reject);
    });

    // Read the video file into a Buffer
    const videoBuffer = await readFile('out.mp4');

    // Encode the Buffer as a base64 string
    const videoBase64 = videoBuffer.toString('base64');

    return videoBase64;
}
