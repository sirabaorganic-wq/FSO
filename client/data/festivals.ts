import { FestivalExperience } from '@/types/experience'
import { agricultureImages } from './images'

export const mockFestivals: FestivalExperience[] = [
  {
    id: 'fest-diwali',
    slug: 'diwali-heritage-celebration',
    name: 'Diwali',
    hindiName: 'दीपावली',
    dateOrMonth: 'October - November',
    tagline: 'Illuminating Kitchens with Sacred Vedic Ghee & Pure Prasad',
    description: 'Diwali is an ode to food purity. Traditional sweets like Mohanbhog and Laddoo are prepared using hand-churned Bilona A2 ghee and organic khandsari sugar.',
    heroImage: agricultureImages.grain,
    regionalTraditions: [
      { region: 'North India', ritual: 'Simmering Besan Laddoo in clay earthenware using Bilona Sahiwal cow ghee.' },
      { region: 'Maharashtra', ritual: 'Preparing Faral savory crispy shankarpali and chakli with cold pressed sesame oil.' },
      { region: 'South India', ritual: 'Dawn Deepavali Legyam herbal digestive paste prepared with wild forest honey.' },
    ],
    essentialProductIds: ['prd-001', 'prd-003', 'prd-006'],
    festiveRecipeIds: ['rcp-803'],
    articleIds: ['art-701'],
    giftBoxId: 'gift-diwali-royal',
  },
  {
    id: 'fest-pongal',
    slug: 'pongal-harvest-thanksgiving',
    name: 'Pongal & Makar Sankranti',
    hindiName: 'पोंगल / मकर संक्रांति',
    dateOrMonth: 'January 14 - 17',
    tagline: 'Harvest Thanksgiving in Clay Pots under Open Sun',
    description: 'Celebrating the winter crop harvest with Sakkarai Pongal cooked in decorated earthenware pots until boiling milk overflows.',
    heroImage: agricultureImages.harvest,
    regionalTraditions: [
      { region: 'Tamil Nadu', ritual: 'Boiling newly harvested rice with jaggery and A2 ghee in terracotta pots.' },
      { region: 'Gujarat & Punjab', ritual: 'Flying kites and eating Til-Gul laddoos made of sesame seeds and jaggery.' },
    ],
    essentialProductIds: ['prd-001', 'prd-002', 'prd-004'],
    festiveRecipeIds: ['rcp-802'],
    articleIds: ['art-702'],
    giftBoxId: 'gift-harvest-box',
  },
  {
    id: 'fest-onam',
    slug: 'onam-sadya-feast',
    name: 'Onam',
    hindiName: 'ओणम',
    dateOrMonth: 'August - September',
    tagline: 'The 26-Dish Grand Harvest Sadya Feast',
    description: 'Celebrated across Kerala with the magnificent Sadya served on fresh banana leaves featuring Kerala matta rice, cold pressed coconut oil, and wild spices.',
    heroImage: agricultureImages.field,
    regionalTraditions: [
      { region: 'Kerala', ritual: 'Preparing Payasam with red Matta rice, coconut milk, and cardamom.' },
    ],
    essentialProductIds: ['prd-002', 'prd-003'],
    festiveRecipeIds: ['rcp-802'],
    articleIds: ['art-702'],
    giftBoxId: 'gift-malabar-box',
  },
]
