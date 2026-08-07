import { SeasonalMonth } from '@/types/experience'
import { agricultureImages } from './images'

export const mockSeasonalMonths: SeasonalMonth[] = [
  {
    month: 'August - September',
    season: 'Varsha (Monsoon)',
    hindiName: 'वर्षा ऋतु',
    focusDescription: 'Warming Pahadi spices, digestive Bilona ghee, finger millets, and wild multifloral honey to balance digestive vata during heavy rains.',
    heroImage: agricultureImages.field,
    keyIngredients: ['Bundelkhand A2 Desi Ghee', 'Kumaon Wild Jakhiya', 'Waynad Black Pepper', 'Western Ghats Raw Honey'],
    recipeIds: ['rcp-801'],
    articleIds: ['art-701'],
    festivalIds: ['fest-onam'],
  },
  {
    month: 'October - November',
    season: 'Sharad (Autumn)',
    hindiName: 'शरद ऋतु',
    focusDescription: 'Pampore Kashmir saffron, organic palm jaggery, and sesame oil for festive sweets, prasad, and crisp autumn cooking.',
    heroImage: agricultureImages.grain,
    keyIngredients: ['Kashmir Mogra Saffron', 'Chettinad Vaagai Sesame Oil', 'Organic Palm Jaggery'],
    recipeIds: ['rcp-803'],
    articleIds: ['art-701'],
    festivalIds: ['fest-diwali'],
  },
  {
    month: 'December - January',
    season: 'Shishir (Winter)',
    hindiName: 'शिशिर ऋतु',
    focusDescription: 'Rich A2 Bilona ghee, Makki-Bajra millets, raw mountain honey, and warming sesame til-gul laddoos.',
    heroImage: agricultureImages.harvest,
    keyIngredients: ['Bundelkhand Bilona Ghee', 'Majuli Joha Rice', 'Tellicherry Black Pepper'],
    recipeIds: ['rcp-802'],
    articleIds: ['art-702'],
    festivalIds: ['fest-pongal'],
  },
]
