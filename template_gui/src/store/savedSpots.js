const initialSpots = [
    {
      id: 'spot_bcn_1',
      name: 'Nhà thờ Thánh Tâm',
      city: 'Barcelona',
      category: 'Tham quan',
      categoryIcon: '🏛️',
      lat: 41.4218,
      lng: 2.1186,
      rating: 4.7,
      reviewsCount: '14,518',
      image: 'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729?w=600&auto=format&fit=crop&q=80',
      description: 'Nhà thờ trên đỉnh đồi do kiến trúc sư Sagnier thiết kế, nổi bật với tượng Thánh Tâm bằng đồng và tầm nhìn toàn cảnh Barcelona.'
    },
    {
      id: 'spot_bcn_2',
      name: 'Basílica de la Sagrada Família',
      city: 'Barcelona',
      category: 'Tham quan',
      categoryIcon: '🏛️',
      lat: 41.4036,
      lng: 2.1744,
      rating: 4.8,
      reviewsCount: '58,920',
      image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=600&auto=format&fit=crop&q=80',
      description: 'Kiệt tác vĩ đại chưa hoàn thiện của kiến trúc sư Antoni Gaudí với các tòa tháp uy nghiêm.'
    },
    {
      id: 'spot_dl_1',
      name: 'Quảng trường Lâm Viên',
      city: 'Đà Lạt',
      category: 'Tham quan',
      categoryIcon: '🏛️',
      lat: 11.9365,
      lng: 108.4452,
      rating: 4.7,
      reviewsCount: '24,150',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
      description: 'Biểu tượng hoa dã quỳ và nụ hoa Atiso khổng lồ bên hồ Xuân Hương.'
    },
    {
      id: 'spot_hn_1',
      name: 'Hồ Hoàn Kiếm & Tháp Rùa',
      city: 'Hà Nội',
      category: 'Tham quan',
      categoryIcon: '🏛️',
      lat: 21.0285,
      lng: 105.8542,
      rating: 4.8,
      reviewsCount: '36,400',
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=600&auto=format&fit=crop&q=80',
      description: 'Trái tim của thủ đô ngàn năm văn hiến, cầu Thê Húc đỏ son soi bóng nước xanh lục thuỷ.'
    }
  ];

export function getSavedSpots() {
  try {
    const saved = JSON.parse(localStorage.getItem("tripmate_saved_spots"));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return initialSpots.map(spot => ({ ...spot }));
}

export function saveSpots(spots) {
  try { localStorage.setItem("tripmate_saved_spots", JSON.stringify(spots)); } catch {}
}

export function getSpotLists(spots = getSavedSpots()) {
  const groups = Object.entries(spots.reduce((all, spot) => { (all[spot.city] ||= []).push(spot); return all; }, {}));
  let custom = [];
  try { const stored = JSON.parse(localStorage.getItem('tripmate_spot_lists')); if (Array.isArray(stored)) custom = stored; } catch {}
  return [...custom.map(list => ({ ...list, spots: spots.filter(s => list.spotIds?.includes(s.id)) })), ...groups.map(([name, items]) => ({ id: `city_${name}`, name, spots: items }))];
}

export function createSpotList(name, spotIds) {
  let lists = [];
  try { const stored = JSON.parse(localStorage.getItem('tripmate_spot_lists')); if (Array.isArray(stored)) lists = stored; } catch {}
  const list = { id: `list_${Date.now()}`, name: name.trim(), spotIds };
  localStorage.setItem('tripmate_spot_lists', JSON.stringify([list, ...lists]));
  return list;
}
