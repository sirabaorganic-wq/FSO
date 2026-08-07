export const image = (id: string, width = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

export const logoUrl = '/images/fso-brand-logo.jpeg'

export const agricultureImages = {
  grain: image('photo-1509358271058-acd22cc93898'),
  spice: image('photo-1596040033229-a9821ebd058d'),
  pantry: image('photo-1532336414038-cf19250c5757'),
  tea: image('photo-1544787219-7f47ccb76574'),
  oil: image('photo-1474979266404-7eaacbcd87c5'),
  farmer: image('photo-1501004318641-b39e6451bec6', 1400),
  field: image('photo-1464226184884-fa280b87c399', 1400),
  market: image('photo-1488459716781-31db52582fe9', 1400),
  workshop: image('photo-1598514982901-ae627a6f5d09', 1400),
  kitchen: image('photo-1556911220-e15b29be8c8f', 1400),
  harvest: image('photo-1499529112087-3cb3b73cec95', 1400),
  village: image('photo-1500530855697-b586d89ba3ee', 1400),
} as const
