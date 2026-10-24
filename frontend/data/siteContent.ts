// Brand content mirrored from naanstaap.co.uk (collected 2026-10-24).
// Update here when the website changes.

const UPLOADS = "https://naanstaap.co.uk/wp-content/uploads";

export const SITE = {
  website: "https://naanstaap.co.uk",
  email: "hello@naanstaap.co.uk",
  tagline:
    "Pull up to your nearest Naan Staap and vibe with the flavours of South Asia.",
  heroImage: `${UPLOADS}/2025/09/Mask-group-11-833x1024.jpg`,
  chaiHeroImage:
    "https://naanstaap.co.uk/wp-content/uploads/2025/09/Mask-group-5-1024x869.jpg",
  featureTiles: [
    { title: "Chai", image: `${UPLOADS}/2025/09/chai-m.jpg`, route: "/chai" },
    {
      title: "Naan",
      image: `${UPLOADS}/2025/09/naan-m.jpg`,
      route: "/menu?category=naan",
    },
    {
      title: "Street",
      image: `${UPLOADS}/2025/09/street-m.jpg`,
      route: "/menu?category=street-food",
    },
  ],
  deliveryPartners: [
    { name: "Deliveroo", url: "https://deliveroo.co.uk/", icon: "bicycle" },
    { name: "Uber Eats", url: "https://www.ubereats.com/", icon: "car-sport" },
  ],
  socials: [
    {
      name: "Instagram",
      url: "https://www.instagram.com/naanstaap/",
      icon: "logo-instagram",
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/NaanStaap",
      icon: "logo-facebook",
    },
  ],
};

export interface InfoPage {
  title: string;
  script: string;
  image: string;
  intro: string;
  quote?: string;
  sections?: { heading: string; body: string }[];
  bullets?: { heading: string; items: string[] };
  cta?: { label: string; route: string };
  enquiry?: {
    type: "franchise" | "catering" | "career";
    heading: string;
    fields: { key: string; label: string; keyboard?: "number-pad" }[];
    options?: { key: string; label: string; values: string[] };
    note?: string;
  };
}

export const INFO_PAGES: Record<string, InfoPage> = {
  about: {
    title: "About us",
    script: "Your everyday chai spot with a twist",
    image:
      "https://naanstaap.co.uk/wp-content/uploads/2025/09/Mask-group-10-1-1138x1536.jpg",
    intro:
      "Naan Staap is where South Asian street food meets London's café culture.",
    sections: [
      {
        heading: "Good food, good vibes",
        body: "Stuffed naans, flaky parathas, loaded wraps, rice bowls and house curries — all made fresh when you order. Traditional desi, contemporary and refined South Asian cuisine, from sunrise to sunset.",
      },
      {
        heading: "Karak, brewed desi-style",
        body: "Strong, creamy Karak Chai simmered with cardamom, plus signature cold drinks and frappés.",
      },
      {
        heading: "Come for the food, stay for the energy",
        body: "A place to chill, catch up or just vibe. Pull up to your nearest Naan Staap — we can't wait to have you back for more.",
      },
      {
        heading: "100% Halal",
        body: "All our food is Halal.",
      },
    ],
    cta: {
      label: "Find a store",
      route: "/stores",
    },
  },
  franchise: {
    title: "Franchise",
    script: "Become our franchise partner",
    image: "https://naanstaap.co.uk/wp-content/uploads/2025/09/franchise.jpg",
    intro:
      "Profitable and consistent growth is the ingredient to achieve our goals. Naan Staap is one of the fastest-growing desi and fusion food brands in the dine-in and takeaway space, with a proven recipe and business model for entrepreneurs.",
    quote: "We create hygienic food and serve it with unlimited happiness.",
    bullets: {
      heading: "Why Naan Staap?",
      items: [
        "A well-established brand with impressive customer feedback",
        "Skilled and experienced leadership Team",
        "In-depth market understanding",
        "Rich Quality Menu",
        "Strong customer base",
        "Low investment & high-profit margin",
        "Use of technology in operational activities",
      ],
    },
    enquiry: {
      type: "franchise",
      heading: "Start with us",
      fields: [
        {
          key: "area",
          label: "Interested area",
        },
      ],
      options: {
        key: "investment",
        label: "Investment",
        values: [
          "£175,000 and above",
          "£200,000 and above",
          "£250,000 and above",
        ],
      },
    },
  },
  catering: {
    title: "Catering",
    script: "Our venue is your place",
    image:
      "https://naanstaap.co.uk/wp-content/uploads/2025/09/Mask-group-8-1-1024x1024.jpg",
    intro:
      "Planning a get-together? Our team of chefs brings home-style food, a range of chais and bites like our Shami Kebab Bun to your event — whether you need a little help or a lot.",
    bullets: {
      heading: "Perfect for",
      items: [
        "Birthday Celebrations",
        "Family Picnics",
        "Holiday Parties",
        "Office lunches",
        "Tea-time gatherings",
      ],
    },
    enquiry: {
      type: "catering",
      heading: "Tell us about your event",
      fields: [
        {
          key: "event_date",
          label: "Event date",
        },
        {
          key: "guests",
          label: "Number of guests",
          keyboard: "number-pad",
        },
        {
          key: "location",
          label: "Event postcode",
        },
      ],
    },
  },
  career: {
    title: "Careers",
    script: "We are so fond of growing!",
    image: "https://naanstaap.co.uk/wp-content/uploads/2025/09/career.jpg",
    intro:
      "Want to be part of the Naan Staap family? Our team is behind everything we achieve — if you want to be amazingly you, we'd love to hear from you.",
    enquiry: {
      type: "career",
      heading: "Apply now",
      fields: [
        {
          key: "position",
          label: "Position",
        },
        {
          key: "postcode",
          label: "Home postcode",
        },
      ],
      note: "Got a CV? Email it to hello@naanstaap.co.uk with your name in the subject.",
    },
  },
};

export const KNOW_YOUR_CUP = {
  intro:
    "Every Naan Staap cup is a little piece of art. Collect them all — each design celebrates an icon, a tradition or a cause close to our hearts.",
  cups: [
    {
      id: "truck-art-cup",
      name: "Truck Art Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/truckart-Cup-1024x1024.jpg",
      title: "Pakistan Truck Art",
      story:
        'Celebrates the colourful "Jingle Truck" art of Pakistan and South Asia: floral patterns and calligraphy on trucks, now recognised as folk art across borders.',
    },
    {
      id: "rikshaw-cup",
      name: "Rikshaw Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/rickshaw-Cup-1024x1024.jpg",
      title: null,
      story: null,
    },
    {
      id: "audrey-hepburn-cup",
      name: "Audrey Hepburn Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/Audrey-Hepburn-1024x1024.jpg",
      title: "Audrey Hepburn",
      story:
        "Tribute to Audrey Hepburn's Breakfast at Tiffany's look with a desi twist: ethnic dress and a cup of Karak Chai instead of the cigarette holder. Urdu text: 'Hot Cup of Tea / Best satisfaction'. The image is also on the wall of the New Road (E1, Whitechapel) branch.",
    },
    {
      id: "baba-cup",
      name: "Baba Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/baba-Cup-1024x1024.jpg",
      title: null,
      story: null,
    },
    {
      id: "ramadan-cup",
      name: "Ramadan Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/ramadan-Cup-1024x1024.jpg",
      title: "The Journey of Self-Exploration!",
      story:
        "Celebrates Ramadan, the ninth month of the Islamic calendar (fasting, prayer, reflection, Iftar and Eid) and the atmosphere of the blessed month.",
    },
    {
      id: "nusrat-fateh-ali-khan-cup",
      name: "Nusrat Fateh Ali Khan Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/Nusrat-fateh-ali-khan-1024x1024.jpg",
      title: "Nusrat Fateh Ali Khan",
      story:
        "Tribute to the qawwali legend from Faisalabad ('Shahenshah-e-Qawwali'). The Urdu wording plays on his qawwali 'Ye jo Halka Halka': 'This little pleasure is the result of this chai'.",
    },
    {
      id: "maulajutt-cup",
      name: "Maulajutt Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/maulajutt-Cup-1024x1024.jpg",
      title: null,
      story: null,
    },
    {
      id: "noor-jahan-cup",
      name: "Noor Jahan Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/Noor-Jehan-Cup-1024x1024.jpg",
      title: "Main te Mera Dilbar Jani",
      story:
        "Tribute to Noor Jehan, 'Malika-e-Tarannum' (Queen of Melody), featuring her song 'Main te mera dilbar jani' (Me and my beloved).",
    },
    {
      id: "markhor-cup",
      name: "Markhor Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/Markhor-Cup-1024x1024.jpg",
      title: "The Magnificent Corkscrew Horned Goat",
      story:
        "Features the Markhor, Pakistan's national animal, a corkscrew-horned mountain goat whose Persian name means 'snake-eater'.",
    },
    {
      id: "waheed-murad-cup",
      name: "Waheed Murad Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/Waheed-murad-Cup-1024x1024.jpg",
      title: "Waheed Murad - The Chocolate Hero",
      story:
        "Tribute to Karachi-born actor Waheed Murad (1938-1983), the 'Chocolate Hero', and his film Armaan, which gave Pakistan its first pop song ('Ko Ko Korina'). Cup text: 'Ko Ko Korina / Have Naan Staap Chai'.",
    },
    {
      id: "winter-cup",
      name: "Winter Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/Winter-Cup-1024x1024.jpg",
      title: null,
      story: null,
    },
    {
      id: "girl-cup",
      name: "Girl Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/Girl-Cup-1024x1024.jpg",
      title: null,
      story: null,
    },
    {
      id: "chacha-cup",
      name: "Chacha Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/Punjabi-Cup-1024x1024.jpg",
      title: null,
      story: null,
    },
    {
      id: "halloween-cup",
      name: "Halloween Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/06/Haloween-Cup-1024x1024.jpg",
      title: null,
      story: null,
    },
    {
      id: "nazia-hassan-cup",
      name: "Nazia Hassan Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2023/08/Nazia-Cup-mockup-1024x1024.jpg",
      title: "The Melodious Beat of Disco Deewane",
      story:
        "The 'Disco Deewane' cup honours Nazia Hassan, Pakistan's 'Queen of Pop' (born Karachi, 1965), whose 1981 album Disco Deewane was a worldwide hit.",
    },
    {
      id: "freedom-cup",
      name: "Freedom Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2024/08/palestine-Cup-mockup-1024x1024.jpg",
      title: "Humanity & Freedom Cup",
      story:
        "A daily reminder to defend human rights and dignity, challenge fear and division, and build a kinder, more compassionate world.",
    },
    {
      id: "true-heroism-cup",
      name: "True Heroism Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2024/08/palestine-Press-Cup-mockup-1024x1024.jpg",
      title: "True Heroism Cup",
      story:
        "The 'True Journalism, True Heroism' cup is a tribute to journalists who risk their lives to seek and report the truth.",
    },
    {
      id: "wow-chai-cup",
      name: "Wow Chai",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2024/11/winter-cup-1-1024x1024.jpg",
      title: "Wow Chai",
      story:
        'The Winter Cup: cosy seasonal design celebrating warmth and togetherness; "the chai that makes your hands warm, your heart happy".',
    },
    {
      id: "marilyn-monroe-cup",
      name: "Marilyn Monroe",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2025/02/Marlin-Cup-mockup-1024x1024.jpg",
      title: "Marilyn Monroe",
      story:
        "Marilyn Monroe reimagined in traditional attire and jewellery, merging Western glamour with Eastern heritage. Cup text: 'Dil barai farokht, qeemat sirf aik cup chai' (The heart is for sale, the cost is just a cup of chai).",
    },
    {
      id: "spring-cup",
      name: "Spring Cup",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2025/05/spring-Cup-mockup-1024x1024.jpg",
      title: "Spring Cup",
      story:
        'Limited-edition Spring-Summer cup for hot drinks, inspired by the bold colours and patterns of South Asian culture. Tagline: "Sip. Smile. Staap into Colours of Life."',
    },
    {
      id: "fall-25-cup",
      name: "Fall 25",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2025/12/Fall-Cup-mockup-1024x1024.jpg",
      title: null,
      story: null,
    },
    {
      id: "sippin-happiness-cup",
      name: "Sippin Happiness",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2025/12/sippin-happones-Cup-mockup-1024x1024.jpg",
      title: "Sippin Happiness",
      story: null,
    },
    {
      id: "valentines-2026-cup",
      name: "Valentines 2026",
      image:
        "https://naanstaap.co.uk/wp-content/uploads/2026/03/30-Valentines-Cup-mockup2.jpg-1024x1024.jpeg",
      title: null,
      story: null,
    },
  ] as {
    id: string;
    name: string;
    image: string;
    title: string | null;
    story: string | null;
  }[],
};
