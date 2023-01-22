import * as dotenv from "dotenv"
dotenv.config()
import TextToSpeech from '@google-cloud/text-to-speech'
import { writeFileSync } from "fs"

async function main() {
  const ttsClient = new TextToSpeech.TextToSpeechClient()
  const [response] = await ttsClient.synthesizeSpeech({
    input: {text: `Give your blog posts a voice.
    PostVoice automatically generates perfectly spoken recordings of your content to improve the SEO and accessibility of your posts.`},
    voice: {
      name: "en-US-Neural2-G",
      languageCode: "en-US"
    },
    audioConfig: {
      audioEncoding: "LINEAR16"
    }
  })

  writeFileSync('out.mp3', response.audioContent!)
}

main()
