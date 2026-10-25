import type { SufficientConditionFilmAsset } from '../components/SufficientConditionFilm';

// Add only generated clips whose picture, narration and captions have been reviewed.
export const sufficientConditionFilms: SufficientConditionFilmAsset[] = [
  {
    id: 'enough-to-know',
    title: 'Enough to know',
    src: '/media/conditionals/sufficiency/enough-to-know.mp4',
    poster: '/media/conditionals/sufficiency/enough-to-know.jpg',
    captions: '/media/conditionals/sufficiency/enough-to-know.vtt',
    caption: "Knowing Maya is enrolled in law school is enough to know she's a student.",
    transcript: "A sufficient condition is enough to guarantee something else. If Maya is enrolled in law school, she's a student. Knowing she's enrolled is enough. We don't need another fact.",
  },
  {
    id: 'what-stays-open',
    title: 'What stays open',
    src: '/media/conditionals/sufficiency/what-stays-open.mp4',
    poster: '/media/conditionals/sufficiency/what-stays-open.jpg',
    captions: '/media/conditionals/sufficiency/what-stays-open.vtt',
    caption: "Knowing Maya is a student doesn't tell us whether she's enrolled in law school.",
    transcript: "Now, suppose all we know is that Maya is a student. Is she enrolled in law school? We don't know. She could be studying history. Being a student doesn't tell us which subject she studies.",
  },
];
