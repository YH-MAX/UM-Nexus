// Editorial examples only. These are never API listings, sellers, or price evidence.
export type ListingExample = {
  id: string;
  title: string;
  category: string;
  price: number;
};

type ExampleCollection = {
  category: string;
  items: ReadonlyArray<readonly [title: string, price: number]>;
};

const collections: ExampleCollection[] = [
  {
    category: "textbooks_notes",
    items: [
      ["Introduction to Algorithms textbook", 65],
      ["Calculus early transcendentals textbook", 45],
      ["Engineering mathematics reference book", 40],
      ["Principles of Economics textbook", 35],
      ["Financial accounting practice workbook", 28],
      ["Organic chemistry study guide", 42],
      ["Human anatomy revision atlas", 55],
      ["Linear algebra worked examples", 32],
      ["Python programming reference book", 38],
      ["Academic English writing handbook", 22],
      ["Research methods pocket guide", 25],
      ["Statistics and probability workbook", 30],
      ["Bahasa Melayu grammar reference", 18],
      ["Business management casebook", 34],
      ["Digital logic design textbook", 48],
    ],
  },
  {
    category: "electronics",
    items: [
      ["Scientific calculator with slide cover", 45],
      ["24-inch Full HD study monitor", 220],
      ["Wireless keyboard and mouse set", 55],
      ["USB-C seven-port laptop hub", 48],
      ["Adjustable aluminium laptop stand", 35],
      ["Over-ear wired study headphones", 60],
      ["Portable Bluetooth speaker", 65],
      ["1080p USB webcam", 50],
      ["1 TB portable external hard drive", 130],
      ["64 GB USB flash drive", 18],
      ["Rechargeable wireless mouse", 30],
      ["Compact mechanical keyboard", 95],
      ["Graphics drawing tablet", 150],
      ["USB document scanner", 180],
      ["Tablet sleeve and folding stand", 28],
    ],
  },
  {
    category: "dorm_room",
    items: [
      ["Rechargeable clip-on desk lamp", 28],
      ["Three-tier bedside storage trolley", 45],
      ["Single-bed cotton sheet set", 30],
      ["Foldable laundry basket", 12],
      ["Over-door hanging organiser", 15],
      ["Blackout curtain panel", 25],
      ["Desktop stationery organiser", 10],
      ["Under-bed storage box set", 24],
      ["Small bedside rug", 18],
      ["Memory foam seat cushion", 22],
      ["Foldable clothes drying rack", 32],
      ["Desk-sized whiteboard", 20],
      ["Set of ten wooden hangers", 12],
      ["Travel toiletry shower caddy", 8],
      ["Full-length freestanding mirror", 38],
    ],
  },
  {
    category: "kitchen_appliances",
    items: [
      ["Compact single-person rice cooker", 50],
      ["1.5-litre electric kettle", 30],
      ["Personal smoothie blender", 45],
      ["Two-slice sandwich toaster", 35],
      ["Small drip coffee maker", 55],
      ["Electric food steamer", 48],
      ["Portable electric lunch box", 38],
      ["Digital kitchen weighing scale", 18],
      ["Handheld milk frother", 12],
      ["Compact coffee grinder", 40],
      ["Mini refrigerator", 220],
      ["Compact microwave oven", 130],
      ["Small countertop oven", 95],
      ["Electric citrus juicer", 32],
      ["Kitchen appliance timer plug", 20],
    ],
  },
  {
    category: "furniture",
    items: [
      ["Compact wooden study desk", 100],
      ["Adjustable mesh office chair", 110],
      ["Three-shelf bookcase", 55],
      ["Folding study table", 38],
      ["Small bedside cabinet", 45],
      ["Stackable plastic storage drawers", 35],
      ["Two-tier shoe rack", 18],
      ["Wooden laptop bed tray", 25],
      ["Foldable floor chair", 42],
      ["Round side table", 32],
      ["Freestanding clothes rail", 40],
      ["Narrow corner shelving unit", 48],
      ["Cushioned study stool", 20],
      ["Small cork noticeboard", 15],
      ["Rolling under-desk cabinet", 65],
    ],
  },
  {
    category: "clothing",
    items: [
      ["Plain navy campus hoodie, size M", 30],
      ["Lightweight rain jacket, size L", 35],
      ["White presentation shirt, size M", 22],
      ["Black formal trousers, size 30", 25],
      ["Canvas tote bag with inner pocket", 12],
      ["Padded laptop backpack", 45],
      ["Running windbreaker, size S", 28],
      ["Cotton polo shirt, size L", 18],
      ["Formal blazer, size M", 55],
      ["Wide-brim outdoor sun hat", 15],
      ["Lightweight sports jersey, size M", 20],
      ["Canvas sneakers, size EU 40", 35],
      ["Crossbody everyday bag", 24],
      ["Modest long-sleeve tunic, size L", 28],
      ["Black presentation shoes, size EU 42", 40],
    ],
  },
  {
    category: "sports_hobby",
    items: [
      ["Badminton racket with carry case", 55],
      ["Table tennis bat and ball set", 28],
      ["Non-slip yoga exercise mat", 25],
      ["Pair of 3 kg dumbbells", 35],
      ["Adjustable skipping rope", 10],
      ["Resistance band exercise set", 18],
      ["Size 5 football", 30],
      ["Indoor basketball", 35],
      ["Acoustic guitar with soft case", 160],
      ["Watercolour painting starter kit", 28],
      ["Wooden chess board set", 25],
      ["1000-piece landscape jigsaw puzzle", 18],
      ["Travel tripod with phone holder", 32],
      ["Hiking daypack with rain cover", 50],
      ["Adult cycling helmet", 40],
    ],
  },
  {
    category: "free_items",
    items: [
      ["Clean moving boxes for semester break", 0],
      ["Spare A4 ring binders", 0],
      ["Unused exercise notebooks", 0],
      ["Assorted stationery bundle", 0],
      ["Small plant pots", 0],
      ["Reusable grocery tote bags", 0],
      ["Empty desk storage jars", 0],
      ["Spare cable organiser clips", 0],
      ["Cork drink coasters", 0],
      ["Paperback fiction bundle", 0],
      ["Clean bubble wrap for moving", 0],
      ["Spare bookends", 0],
      ["Plastic document folders", 0],
      ["Unopened sticky-note pads", 0],
      ["Reusable gift bags", 0],
    ],
  },
];

// Mix categories so the first page includes every campus collection.
export const listingExamples: ListingExample[] = Array.from(
  { length: Math.max(...collections.map(({ items }) => items.length)) },
  (_, index) => collections.flatMap(({ category, items }) => {
    const item = items[index];
    return item ? [{ id: `example-${category}-${index + 1}`, title: item[0], category, price: item[1] }] : [];
  }),
).flat();

export function getListingExample(id: string): ListingExample | undefined {
  return listingExamples.find((item) => item.id === id);
}

const categoryDescriptions: Record<string, string> = {
  textbooks_notes: "A study reference for lectures, coursework and revision. For a real listing, include the edition, course relevance, annotations and any missing pages.",
  electronics: "A practical addition to a student study setup. For a real listing, describe compatibility, working condition, included accessories and any battery or connection issues.",
  dorm_room: "An everyday item for a more organised student room. For a real listing, include dimensions, material, signs of use and what is included.",
  kitchen_appliances: "A compact appliance idea for everyday meal preparation. For a real listing, include capacity, working condition, cleaning details and accessories, and check your accommodation's appliance rules.",
  furniture: "A space-conscious furniture idea for studying or room storage. For a real listing, include measurements, material, stability, visible wear and collection arrangements.",
  clothing: "An idea for campus, presentations or everyday wear. For a real listing, include the labelled size, measurements, material, care details and any visible wear.",
  sports_hobby: "An idea for staying active or enjoying time between classes. For a real listing, describe the size, condition, included equipment and any wear that affects safe use.",
  free_items: "An example of useful items that could be passed on to another student for free. For a real listing, describe the quantity, cleanliness, condition and collection arrangements.",
};

export function describeListingExample(item: ListingExample): string {
  return `${item.title}. ${categoryDescriptions[item.category]} This is a fictional example; the photo and price are references, and no item is offered for sale.`;
}

export function findListingExamples(filters: {
  search: string;
  category: string;
  condition: string;
  pickup_location: string;
  status: string;
  min_price: string;
  max_price: string;
  sort: string;
}): ListingExample[] {
  // Examples have no actual condition, collection point, or sale status.
  if (filters.condition || filters.pickup_location || filters.status) return [];
  const query = filters.search.trim().toLowerCase();
  const minimum = filters.min_price.trim() ? Number(filters.min_price) : NaN;
  const maximum = filters.max_price.trim() ? Number(filters.max_price) : NaN;
  const invalidRange = Number.isFinite(minimum) && Number.isFinite(maximum) && minimum > maximum;
  const results = listingExamples.filter((item) =>
    (!filters.category || item.category === filters.category) &&
    (!query || `${item.title} ${item.category.replaceAll("_", " ")}`.toLowerCase().includes(query)) &&
    (invalidRange || !Number.isFinite(minimum) || item.price >= minimum) &&
    (invalidRange || !Number.isFinite(maximum) || item.price <= maximum),
  );
  if (filters.sort === "price_low_high") results.sort((a, b) => a.price - b.price);
  if (filters.sort === "price_high_low") results.sort((a, b) => b.price - a.price);
  return results;
}
