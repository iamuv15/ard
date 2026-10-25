require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

async function seed() {
  const chapterId = 16;
  const subCategory = 'Soil Texture & Mechanical Analysis';
  const targetKeywords = ['Soil Texture', 'Sand', 'Silt', 'Clay', 'Coarse Sand', 'Soil Textural Triangle'];

  const existingTrack = await prisma.chapterAudioTrack.findFirst({
    where: { chapterId, title: 'Soil Separates & Textural Triangle' }
  });

  let track = existingTrack;
  if (!track) {
    console.log('Inserting existing track into ChapterAudioTrack table...');
    track = await prisma.chapterAudioTrack.create({
      data: {
        id: 'soil-texture-field-analysis',
        chapterId,
        subCategory,
        title: 'Soil Separates & Textural Triangle',
        subtitle: 'Gemini 3.8 Studio TTS • Natural Hinglish Dialogue • 6.4 mins',
        audioUrl: '/audio/soil/soil-texture-and-triangle.mp3',
        storagePath: 'chapter-16/soil-texture/soil-texture-and-triangle.mp3',
        durationSec: 385.87,
        fileSizeBytes: 3084792,
        keywordTimestamps: {
          "Soil Texture": 0.0,
          "Sand": 82.07,
          "Coarse Sand": 150.82,
          "Silt": 200.73,
          "Clay": 268.44,
          "Soil Textural Triangle": 346.67
        },
        status: 'COMPLETED'
      }
    });
    console.log(`Created track ${track.id}`);
  }

  // Link the 6 concepts
  console.log('Linking concepts to track...');
  const res = await prisma.chapterConcept.updateMany({
    where: {
      chapterId,
      term: { in: targetKeywords }
    },
    data: {
      audioTrackId: track.id
    }
  });

  console.log(`Linked ${res.count} concepts to track "${track.title}"!`);
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
