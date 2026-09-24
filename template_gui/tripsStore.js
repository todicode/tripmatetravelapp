/**
 * TripMate - OpenStreetMap Integration & LocalStorage Trips Store
 * Strictly adheres to DESIGN.md (Action Blue #0066cc, SF Pro typography, Parchment #f5f5f7)
 * NO EMOJI. Clean SVG or text badges only.
 */

const TRIPS_STORAGE_KEY = 'tripmate_trips_cache';
const EXPENSES_STORAGE_KEY = 'tripmate_expenses_cache';
const CHECKLIST_STORAGE_KEY = 'tripmate_checklist_cache';

// Comprehensive lookup dictionary of coordinates for Vietnamese provinces & travel hubs
const KNOWN_COORDINATES = {
  'dalat': { name: 'Đà Lạt', province: 'Lâm Đồng', coords: [11.9404, 108.4583] },
  'hanoi': { name: 'Hà Nội', province: 'Hà Nội', coords: [21.0285, 105.8542] },
  'saigon': { name: 'TP. Hồ Chí Minh', province: 'TP. Hồ Chí Minh', coords: [10.8231, 106.6297] },
  'tphcm': { name: 'TP. Hồ Chí Minh', province: 'TP. Hồ Chí Minh', coords: [10.8231, 106.6297] },
  'danang': { name: 'Đà Nẵng', province: 'Đà Nẵng', coords: [16.0544, 108.2022] },
  'haiphong': { name: 'Hải Phòng', province: 'Hải Phòng', coords: [20.8449, 106.6881] },
  'cantho': { name: 'Cần Thơ', province: 'Cần Thơ', coords: [10.0452, 105.7469] },
  'vungtau': { name: 'Vũng Tàu', province: 'Bà Rịa - Vũng Tàu', coords: [10.3460, 107.0843] },
  'bariavungtau': { name: 'Bà Rịa - Vũng Tàu', province: 'Bà Rịa - Vũng Tàu', coords: [10.4960, 107.1685] },
  'ninhbinh': { name: 'Ninh Bình', province: 'Ninh Bình', coords: [20.2506, 105.9745] },
  'phuquoc': { name: 'Phú Quốc', province: 'Kiên Giang', coords: [10.2289, 103.9572] },
  'hoian': { name: 'Hội An', province: 'Quảng Nam', coords: [15.8801, 108.3380] },
  'sapa': { name: 'Sa Pa', province: 'Lào Cai', coords: [22.3364, 103.8438] },
  'nhatrang': { name: 'Nha Trang', province: 'Khánh Hòa', coords: [12.2388, 109.1967] },
  'hue': { name: 'Huế', province: 'Thừa Thiên Huế', coords: [16.4637, 107.5909] },
  'quynhon': { name: 'Quy Nhơn', province: 'Bình Định', coords: [13.7820, 109.2197] },
  'phanthiet': { name: 'Phan Thiết', province: 'Bình Thuận', coords: [10.9805, 108.2615] },
  'muine': { name: 'Mũi Né', province: 'Bình Thuận', coords: [10.9333, 108.2833] },
  'hagiang': { name: 'Hà Giang', province: 'Hà Giang', coords: [22.8233, 104.9839] },
  'caobang': { name: 'Cao Bằng', province: 'Cao Bằng', coords: [22.6666, 106.2639] },
  'halong': { name: 'Hạ Long', province: 'Quảng Ninh', coords: [20.9505, 107.0734] },
  'quangninh': { name: 'Quảng Ninh', province: 'Quảng Ninh', coords: [21.0064, 107.2925] },
  'quangbinh': { name: 'Quảng Bình', province: 'Quảng Bình', coords: [17.4689, 106.6225] },
  'phongnha': { name: 'Phong Nha', province: 'Quảng Bình', coords: [17.5833, 106.2833] },
  'donghoi': { name: 'Đồng Hới', province: 'Quảng Bình', coords: [17.4689, 106.6225] },
  'quangtri': { name: 'Quảng Trị', province: 'Quảng Trị', coords: [16.7500, 107.1856] },
  'quangngai': { name: 'Quảng Ngãi', province: 'Quảng Ngãi', coords: [15.1205, 108.7923] },
  'lyson': { name: 'Đảo Lý Sơn', province: 'Quảng Ngãi', coords: [15.3789, 109.1172] },
  'phuyen': { name: 'Phú Yên', province: 'Phú Yên', coords: [13.0882, 109.3138] },
  'tuyhoa': { name: 'Tuy Hòa', province: 'Phú Yên', coords: [13.0882, 109.3138] },
  'ninhthuan': { name: 'Ninh Thuận', province: 'Ninh Thuận', coords: [11.5663, 108.9882] },
  'phanrang': { name: 'Phan Rang', province: 'Ninh Thuận', coords: [11.5663, 108.9882] },
  'daklak': { name: 'Đắk Lắk', province: 'Đắk Lắk', coords: [12.6667, 108.0500] },
  'buonmathuot': { name: 'Buôn Ma Thuột', province: 'Đắk Lắk', coords: [12.6667, 108.0500] },
  'daknong': { name: 'Đắk Nông', province: 'Đắk Nông', coords: [12.0033, 107.6908] },
  'gialai': { name: 'Gia Lai', province: 'Gia Lai', coords: [13.9833, 108.0000] },
  'pleiku': { name: 'Pleiku', province: 'Gia Lai', coords: [13.9833, 108.0000] },
  'kontum': { name: 'Kon Tum', province: 'Kon Tum', coords: [14.3500, 108.0000] },
  'baoloc': { name: 'Bảo Lộc', province: 'Lâm Đồng', coords: [11.5478, 107.8064] },
  'tayninh': { name: 'Tây Ninh', province: 'Tây Ninh', coords: [11.3100, 106.0983] },
  'binhduong': { name: 'Bình Dương', province: 'Bình Dương', coords: [10.9805, 106.6519] },
  'dongnai': { name: 'Đồng Nai', province: 'Đồng Nai', coords: [10.9574, 106.8427] },
  'bienhoa': { name: 'Biên Hòa', province: 'Đồng Nai', coords: [10.9574, 106.8427] },
  'longan': { name: 'Long An', province: 'Long An', coords: [10.5360, 106.4114] },
  'tiengiang': { name: 'Tiền Giang', province: 'Tiền Giang', coords: [10.3542, 106.3653] },
  'mytho': { name: 'Mỹ Tho', province: 'Tiền Giang', coords: [10.3542, 106.3653] },
  'bentre': { name: 'Bến Tre', province: 'Bến Tre', coords: [10.2415, 106.3759] },
  'dongthap': { name: 'Đồng Tháp', province: 'Đồng Tháp', coords: [10.4599, 105.6328] },
  'sadec': { name: 'Sa Đéc', province: 'Đồng Tháp', coords: [10.2974, 105.7578] },
  'vinhlong': { name: 'Vĩnh Long', province: 'Vĩnh Long', coords: [10.2537, 105.9722] },
  'travinh': { name: 'Trà Vinh', province: 'Trà Vinh', coords: [9.9347, 106.3455] },
  'haugiang': { name: 'Hậu Giang', province: 'Hậu Giang', coords: [9.7844, 105.4701] },
  'soctrang': { name: 'Sóc Trăng', province: 'Sóc Trăng', coords: [9.6033, 105.9800] },
  'baclieu': { name: 'Bạc Liêu', province: 'Bạc Liêu', coords: [9.2941, 105.7278] },
  'camau': { name: 'Cà Mau', province: 'Cà Mau', coords: [9.1769, 105.1524] },
  'angiang': { name: 'An Giang', province: 'An Giang', coords: [10.3759, 105.4358] },
  'chaudoc': { name: 'Châu Đốc', province: 'An Giang', coords: [10.7029, 105.1189] },
  'kiengiang': { name: 'Kiên Giang', province: 'Kiên Giang', coords: [9.9575, 105.1378] },
  'rachgia': { name: 'Rạch Giá', province: 'Kiên Giang', coords: [10.0125, 105.0809] },
  'hatien': { name: 'Hà Tiên', province: 'Kiên Giang', coords: [10.3833, 104.4833] },
  'nghean': { name: 'Nghệ An', province: 'Nghệ An', coords: [18.6734, 105.6813] },
  'vinh': { name: 'TP. Vinh', province: 'Nghệ An', coords: [18.6734, 105.6813] },
  'hatinh': { name: 'Hà Tĩnh', province: 'Hà Tĩnh', coords: [18.3429, 105.9059] },
  'thanhhoa': { name: 'Thanh Hóa', province: 'Thanh Hóa', coords: [19.8067, 105.7852] },
  'samson': { name: 'Sầm Sơn', province: 'Thanh Hóa', coords: [19.7428, 105.9048] },
  'namdinh': { name: 'Nam Định', province: 'Nam Định', coords: [20.4200, 106.1683] },
  'thaibinh': { name: 'Thái Bình', province: 'Thái Bình', coords: [20.4464, 106.3365] },
  'hanam': { name: 'Hà Nam', province: 'Hà Nam', coords: [20.5453, 105.9125] },
  'hungyen': { name: 'Hưng Yên', province: 'Hưng Yên', coords: [20.6464, 106.0511] },
  'haiduong': { name: 'Hải Dương', province: 'Hải Dương', coords: [20.9373, 106.3145] },
  'bacninh': { name: 'Bắc Ninh', province: 'Bắc Ninh', coords: [21.1861, 106.0763] },
  'bacgiang': { name: 'Bắc Giang', province: 'Bắc Giang', coords: [21.2731, 106.1946] },
  'vinhphuc': { name: 'Vĩnh Phúc', province: 'Vĩnh Phúc', coords: [21.3089, 105.6049] },
  'tamdao': { name: 'Tam Đảo', province: 'Vĩnh Phúc', coords: [21.4589, 105.6481] },
  'phutho': { name: 'Phú Thọ', province: 'Phú Thọ', coords: [21.3228, 105.4019] },
  'thainguyen': { name: 'Thái Nguyên', province: 'Thái Nguyên', coords: [21.5942, 105.8481] },
  'tuyenquang': { name: 'Tuyên Quang', province: 'Tuyên Quang', coords: [21.8233, 105.2181] },
  'yenbai': { name: 'Yên Bái', province: 'Yên Bái', coords: [21.7167, 104.8667] },
  'mucangchai': { name: 'Mù Cang Chải', province: 'Yên Bái', coords: [21.8542, 104.0889] },
  'sonla': { name: 'Sơn La', province: 'Sơn La', coords: [21.3283, 103.9144] },
  'mocchau': { name: 'Mộc Châu', province: 'Sơn La', coords: [20.8406, 104.6472] },
  'dienbien': { name: 'Điện Biên', province: 'Điện Biên', coords: [21.3869, 103.0231] },
  'laichau': { name: 'Lai Châu', province: 'Lai Châu', coords: [22.3964, 103.4589] },
  'langson': { name: 'Lạng Sơn', province: 'Lạng Sơn', coords: [21.8536, 106.7615] },
  'backan': { name: 'Bắc Kạn', province: 'Bắc Kạn', coords: [22.1470, 105.8348] },
  'hoabinh': { name: 'Hòa Bình', province: 'Hòa Bình', coords: [20.8172, 105.3376] },
  'maichau': { name: 'Mai Châu', province: 'Hòa Bình', coords: [20.6667, 105.0833] },
  'condao': { name: 'Côn Đảo', province: 'Bà Rịa - Vũng Tàu', coords: [8.6833, 106.6000] },
  'phuquy': { name: 'Đảo Phú Quý', province: 'Bình Thuận', coords: [10.5186, 108.9431] },
  'catba': { name: 'Đảo Cát Bà', province: 'Hải Phòng', coords: [20.7289, 107.0436] }
};

// Helper: normalize Vietnamese diacritics for search
function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  return str.toLowerCase().trim();
}

// Curated OpenStreetMap destinations with multi-day itineraries and selectable hot locations
const OSM_DESTINATIONS = {
  'dalat': {
    name: 'Đà Lạt',
    province: 'Lâm Đồng',
    fullName: 'Đà Lạt, Lâm Đồng',
    coords: [11.9404, 108.4583],
    weather: { temp: '19°C', condition: 'Se lạnh, có sương mù nhẹ', tip: 'Nên chuẩn bị áo khoác mỏng' },
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Săn mây Cầu Đất & Check-in trung tâm',
        duration: '1 ngày',
        highlight: 'Bình minh đồi chè, cafe acoustic và dạo chợ đêm',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 101, name: 'Quảng trường Lâm Viên', time: '07:30', lat: 11.9365, lng: 108.4452, status: 'completed', note: 'Điểm tập kết, check-in Nụ hoa Atiso', category: 'checkin' },
          { id: 102, name: 'Hồ Xuân Hương', time: '08:45', lat: 11.9419, lng: 108.4442, status: 'active', note: 'Dạo quanh hồ, thưởng thức sữa đậu nành nóng', category: 'nature' },
          { id: 103, name: 'Tiệm Cà Phê Mây Lang Thang', time: '10:30', lat: 11.9281, lng: 108.4310, status: 'pending', note: 'Cafe view thung lũng rừng thông', category: 'cafe' },
          { id: 104, name: 'Đồi Chè Cầu Đất Farm', time: '14:00', lat: 11.8576, lng: 108.5392, status: 'pending', note: 'Ngắm tuabin gió và đồi chè cổ thụ', category: 'nature' },
          { id: 105, name: 'Chợ Đêm Đà Lạt', time: '18:30', lat: 11.9426, lng: 108.4374, status: 'pending', note: 'Bánh tráng nướng, dâu tây lắc', category: 'food' }
        ]
      },
      {
        dayNumber: 2,
        dayTitle: 'Ngày 2: Rừng thông, Hồ Tuyền Lâm & Máng trượt',
        duration: '1 ngày',
        highlight: 'Trải nghiệm máng trượt Datanla và không gian thiền tịnh',
        badge: 'Khuyên dùng cho Ngày 2',
        stops: [
          { id: 106, name: 'Thác Datanla', time: '08:00', lat: 11.9029, lng: 108.4489, status: 'pending', note: 'Trượt máng xuyên rừng thông núi đá', category: 'nature' },
          { id: 107, name: 'Thiền Viện Trúc Lâm & Hồ Tuyền Lâm', time: '10:30', lat: 11.9048, lng: 108.4348, status: 'pending', note: 'Không gian tĩnh lặng bên rừng thông', category: 'culture' },
          { id: 108, name: 'Quán Lẩu Gà Lá É Tao Ngộ', time: '12:30', lat: 11.9312, lng: 108.4435, status: 'pending', note: 'Đặc sản trưa ấm nóng chuẩn vị', category: 'food' },
          { id: 109, name: 'Dinh III Bảo Đại', time: '14:30', lat: 11.9298, lng: 108.4304, status: 'pending', note: 'Dinh thự cổ kính của vị vua cuối cùng', category: 'culture' },
          { id: 110, name: 'Tiệm Cà Phê Túi Mơ To', time: '16:30', lat: 11.9460, lng: 108.4720, status: 'pending', note: 'Vườn hoa cúc họa mi ngắm hoàng hôn', category: 'cafe' }
        ]
      }
    ],
    hotSpots: [
      { id: 'dalat_h1', name: 'Tiệm Cà Phê Túi Mơ To', category: 'cafe', categoryLabel: 'Cà phê', lat: 11.9460, lng: 108.4720, note: 'Vườn hoa cúc họa mi view nhà lồng đêm rực rỡ' },
      { id: 'dalat_h2', name: 'Đồi Chè Cầu Đất Farm', category: 'nature', categoryLabel: 'Thắng cảnh', lat: 11.8576, lng: 108.5392, note: 'Săn mây sớm và tuabin quạt gió khổng lồ' },
      { id: 'dalat_h3', name: 'Lẩu Bò Ba Toa Nhà Gỗ', category: 'food', categoryLabel: 'Ẩm thực', lat: 11.9388, lng: 108.4298, note: 'Nồi lẩu bò thơm nức tiếng xứ sương mù' },
      { id: 'dalat_h4', name: 'Thác Datanla', category: 'nature', categoryLabel: 'Thắng cảnh', lat: 11.9029, lng: 108.4489, note: 'Máng trượt dài nhất Đông Nam Á xuyên thông' },
      { id: 'dalat_h5', name: 'Chợ Đêm Đà Lạt', category: 'food', categoryLabel: 'Ẩm thực', lat: 11.9426, lng: 108.4374, note: 'Khu ẩm thực đường phố và mua sắm đồ len' }
    ]
  },
  'ninhbinh': {
    name: 'Ninh Bình',
    province: 'Ninh Bình',
    fullName: 'Ninh Bình, Việt Nam',
    coords: [20.2506, 105.9745],
    weather: { temp: '25°C', condition: 'Trời quang đãng, non nước hữu tình', tip: 'Mang nón lá và quạt tay khi ngồi đò' },
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Quần thể Tràng An & Hang Múa',
        duration: '1 ngày',
        highlight: 'Chèo thuyền nan luồn qua các hang động và ngắm toàn cảnh Tam Cốc',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 601, name: 'Khu Du Lịch Sinh Thái Tràng An', time: '08:30', lat: 20.2568, lng: 105.9182, status: 'completed', note: 'Di sản Văn hóa và Thiên nhiên Thế giới UNESCO', category: 'nature' },
          { id: 602, name: 'Nhà Hàng Dê Núi Ninh Bình', time: '12:00', lat: 20.2450, lng: 105.9320, status: 'active', note: 'Đặc sản thịt dê cơm cháy truyền thống', category: 'food' },
          { id: 603, name: 'Hang Múa & Đỉnh Ngọa Long', time: '15:00', lat: 20.2315, lng: 105.9392, status: 'pending', note: 'Chinh phục gần 500 bậc đá ngắm kỳ quan', category: 'nature' }
        ]
      },
      {
        dayNumber: 2,
        dayTitle: 'Ngày 2: Chùa Bái Đính & Cố Đô Hoa Lư',
        duration: '1 ngày',
        highlight: 'Ngôi chùa lớn nhất Đông Nam Á và kinh đô đầu tiên của nước Đại Cồ Việt',
        badge: 'Khuyên dùng cho Ngày 2',
        stops: [
          { id: 604, name: 'Chùa Bái Đính Cổ & Mới', time: '08:30', lat: 20.2709, lng: 105.8679, status: 'pending', note: 'Quần thể tâm linh hùng vĩ với nhiều kỷ lục châu Á', category: 'culture' },
          { id: 605, name: 'Cố Đô Hoa Lư', time: '14:00', lat: 20.2828, lng: 105.9048, status: 'pending', note: 'Đền vua Đinh Tiên Hoàng và vua Lê Đại Hành', category: 'culture' }
        ]
      }
    ],
    hotSpots: [
      { id: 'nb_h1', name: 'Tràng An Di Sản Thế Giới', category: 'nature', categoryLabel: 'Di sản', lat: 20.2568, lng: 105.9182, note: 'Hạ Long trên cạn với hệ thống hang động tuyệt mỹ' },
      { id: 'nb_h2', name: 'Đỉnh Hang Múa', category: 'nature', categoryLabel: 'Check-in', lat: 20.2315, lng: 105.9392, note: 'Bậc đá vươn lên đỉnh núi rồng uốn lượn' },
      { id: 'nb_h3', name: 'Tam Cốc - Bích Động', category: 'nature', categoryLabel: 'Thắng cảnh', lat: 20.2185, lng: 105.9351, note: 'Cung đường lúa vàng trên sông Ngô Đồng' },
      { id: 'nb_h4', name: 'Chùa Bái Đính', category: 'culture', categoryLabel: 'Tâm linh', lat: 20.2709, lng: 105.8679, note: 'Đại tượng Phật bằng đồng và hành lang La Hán' }
    ]
  },
  'danang': {
    name: 'Đà Nẵng',
    province: 'Đà Nẵng',
    fullName: 'Đà Nẵng, Việt Nam',
    coords: [16.0544, 108.2022],
    weather: { temp: '28°C', condition: 'Nắng gió mát, biển êm', tip: 'Thích hợp tắm biển và ngắm Cầu Rồng' },
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Bán đảo Sơn Trà, Cầu Rồng & Biển Mỹ Khê',
        duration: '1 ngày',
        highlight: 'Chùa Linh Ứng ngắm vịnh biển, tắm biển Mỹ Khê và Cầu Rồng',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 501, name: 'Chùa Linh Ứng Bãi Bụt', time: '08:00', lat: 16.1001, lng: 108.2778, status: 'completed', note: 'Tượng Phật Bà Quan Âm cao nhất Việt Nam', category: 'culture' },
          { id: 502, name: 'Bãi Biển Mỹ Khê', time: '10:30', lat: 16.0601, lng: 108.2468, status: 'active', note: 'Một trong những bãi biển quyến rũ nhất hành tinh', category: 'nature' },
          { id: 503, name: 'Cầu Rồng & Cầu Tình Yêu', time: '19:30', lat: 16.0611, lng: 108.2274, status: 'pending', note: 'Biểu tượng thành phố đáng sống bên sông Hàn', category: 'checkin' }
        ]
      },
      {
        dayNumber: 2,
        dayTitle: 'Ngày 2: Sun World Bà Nà Hills & Cầu Vàng',
        duration: '1 ngày',
        highlight: 'Chạm tay vào Cầu Vàng giữa lưng chừng mây và Làng Pháp',
        badge: 'Khuyên dùng cho Ngày 2',
        stops: [
          { id: 505, name: 'Cáp Treo Bà Nà Hills', time: '08:30', lat: 15.9984, lng: 107.9942, status: 'pending', note: 'Tuyến cáp treo đạt nhiều kỷ lục thế giới', category: 'experience' },
          { id: 506, name: 'Cầu Vàng Đôi Bàn Tay', time: '10:00', lat: 15.9950, lng: 107.9965, status: 'pending', note: 'Kiến trúc kỳ quan nổi tiếng toàn cầu', category: 'nature' }
        ]
      }
    ],
    hotSpots: [
      { id: 'dn_h1', name: 'Cầu Vàng Bà Nà Hills', category: 'nature', categoryLabel: 'Kỳ quan', lat: 15.9950, lng: 107.9965, note: 'Điểm check-in đẳng cấp thế giới' },
      { id: 'dn_h2', name: 'Bán Đảo Sơn Trà', category: 'nature', categoryLabel: 'Thắng cảnh', lat: 16.1189, lng: 108.2831, note: 'Lá phổi xanh ngắm trọn vẹn thành phố' },
      { id: 'dn_h3', name: 'Chợ Đêm Sơn Trà', category: 'food', categoryLabel: 'Ẩm thực', lat: 16.0617, lng: 108.2312, note: 'Khu ẩm thực hải sản và quà lưu niệm' }
    ]
  },
  'phuquoc': {
    name: 'Phú Quốc',
    province: 'Kiên Giang',
    fullName: 'Phú Quốc, Kiên Giang',
    coords: [10.2289, 103.9572],
    weather: { temp: '29°C', condition: 'Nắng đẹp, gió biển dịu', tip: 'Mang kem chống nắng và kính râm' },
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Nam Đảo, Cáp treo Hòn Thơm & Bãi Sao',
        duration: '1 ngày',
        highlight: 'Cáp treo vượt biển, tắm biển bãi Sao và ngắm hoàng hôn',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 201, name: 'Bãi Sao Phú Quốc', time: '09:00', lat: 10.0531, lng: 104.0328, status: 'completed', note: 'Bãi cát trắng mịn, nước trong xanh', category: 'nature' },
          { id: 202, name: 'Ga An Thới Cáp Treo', time: '13:00', lat: 10.0264, lng: 104.0152, status: 'active', note: 'Cáp treo vượt biển sang Hòn Thơm', category: 'experience' },
          { id: 203, name: 'Chợ Đêm Phú Quốc', time: '19:30', lat: 10.2185, lng: 103.9634, status: 'pending', note: 'Hải sản nướng, bún quậy Kiến Xây', category: 'food' }
        ]
      }
    ],
    hotSpots: [
      { id: 'pq_h1', name: 'Bãi Sao Phú Quốc', category: 'nature', categoryLabel: 'Bãi biển', lat: 10.0531, lng: 104.0328, note: 'Bãi biển đẹp nhất Nam Đảo với cát trắng muốt' },
      { id: 'pq_h2', name: 'Bún Quậy Kiến Xây', category: 'food', categoryLabel: 'Ẩm thực', lat: 10.2178, lng: 103.9622, note: 'Tự pha nước chấm hải sản tươi quậy liền tay' },
      { id: 'pq_h3', name: 'Sunset Sanato', category: 'cafe', categoryLabel: 'Check-in', lat: 10.1654, lng: 103.9712, note: 'Địa điểm ngắm hoàng hôn nổi tiếng' }
    ]
  },
  'sapa': {
    name: 'Sa Pa',
    province: 'Lào Cai',
    fullName: 'Sa Pa, Lào Cai',
    coords: [22.3364, 103.8438],
    weather: { temp: '16°C', condition: 'Lạnh nhiều mây, sương mù', tip: 'Cần áo phao dày và giày chống trơn' },
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Chinh phục Fansipan & Bản Cát Cát',
        duration: '1 ngày',
        highlight: 'Nóc nhà Đông Dương 3.143m và bản làng người H’Mông',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 401, name: 'Nhà Thờ Đá Sa Pa', time: '08:00', lat: 22.3353, lng: 103.8415, status: 'completed', note: 'Kiến trúc Pháp cổ trung tâm thị xã', category: 'culture' },
          { id: 402, name: 'Cáp Treo Fansipan Legend', time: '09:30', lat: 22.3248, lng: 103.8202, status: 'active', note: 'Tuyến cáp treo vượt biển mây Mường Hoa', category: 'experience' },
          { id: 403, name: 'Bản Cát Cát', time: '14:30', lat: 22.3279, lng: 103.8344, status: 'pending', note: 'Suối Tiên Sa, nhà trình tường truyền thống', category: 'culture' }
        ]
      }
    ],
    hotSpots: [
      { id: 'sp_h1', name: 'Đỉnh Fansipan 3.143m', category: 'nature', categoryLabel: 'Đỉnh núi', lat: 22.3034, lng: 103.7752, note: 'Nóc nhà Đông Dương giữa ngàn mây' },
      { id: 'sp_h2', name: 'Bản Cát Cát', category: 'culture', categoryLabel: 'Bản làng', lat: 22.3279, lng: 103.8344, note: 'Check-in thác nước và guồng nước gỗ' },
      { id: 'sp_h3', name: 'Cổng Trời Ô Quy Hồ', category: 'nature', categoryLabel: 'Đèo núi', lat: 22.3551, lng: 103.7592, note: 'Săn mây chiều hoàng hôn tuyệt mỹ' }
    ]
  },
  'hoian': {
    name: 'Hội An',
    province: 'Quảng Nam',
    fullName: 'Hội An, Quảng Nam',
    coords: [15.8801, 108.3380],
    weather: { temp: '27°C', condition: 'Khô ráo, chiều lộng gió', tip: 'Thích hợp đi bộ và đạp xe' },
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Di sản phố cổ đèn lồng & Thuyền sông Hoài',
        duration: '1 ngày',
        highlight: 'Chùa Cầu, nhà cổ hàng trăm năm tuổi và thả đèn hoa đăng',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 301, name: 'Chùa Cầu Hội An', time: '08:30', lat: 15.8771, lng: 108.3260, status: 'completed', note: 'Biểu tượng lịch sử văn hóa đô thị cổ', category: 'culture' },
          { id: 302, name: 'Nhà Cổ Tấn Ký', time: '10:15', lat: 15.8767, lng: 108.3283, status: 'active', note: 'Kiến trúc giao thoa ba nền văn hóa', category: 'culture' },
          { id: 304, name: 'Bờ Sông Hoài Phố Cổ', time: '18:30', lat: 15.8761, lng: 108.3275, status: 'pending', note: 'Thả đèn hoa đăng lung linh và ăn cao lầu', category: 'food' }
        ]
      }
    ],
    hotSpots: [
      { id: 'ha_h1', name: 'Chùa Cầu Hội An', category: 'culture', categoryLabel: 'Di tích', lat: 15.8771, lng: 108.3260, note: 'Di tích biểu tượng hơn 400 năm tuổi' },
      { id: 'ha_h2', name: 'Bánh Mì Phượng Hội An', category: 'food', categoryLabel: 'Ẩm thực', lat: 15.8792, lng: 108.3325, note: 'Tiệm bánh mì nổi tiếng thế giới' },
      { id: 'ha_h3', name: 'Cà Phê Faifo Hội An', category: 'cafe', categoryLabel: 'Cà phê', lat: 15.8778, lng: 108.3288, note: 'View sân thượng ngắm mái ngói rêu phong' }
    ]
  },
  'nhatrang': {
    name: 'Nha Trang',
    province: 'Khánh Hòa',
    fullName: 'Nha Trang, Khánh Hòa',
    coords: [12.2388, 109.1967],
    weather: { temp: '30°C', condition: 'Trời nắng trong veo, sóng êm', tip: 'Rất thích hợp lặn biển ngắm san hô' },
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Tháp Bà Ponagar & VinWonders Hòn Tre',
        duration: '1 ngày',
        highlight: 'Di tích văn hóa Chăm Pa cổ và cáp treo vượt vịnh biển',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 701, name: 'Tháp Bà Ponagar', time: '08:00', lat: 12.2654, lng: 109.1958, status: 'completed', note: 'Kiến trúc đền tháp gạch nung ngàn năm', category: 'culture' },
          { id: 702, name: 'Nem Nướng Đặng Văn Quyên', time: '11:30', lat: 12.2472, lng: 109.1912, status: 'active', note: 'Đặc sản nem nướng thơm phức nước chấm gan thịt', category: 'food' },
          { id: 703, name: 'VinWonders Nha Trang (Hòn Tre)', time: '14:00', lat: 12.2178, lng: 109.2432, status: 'pending', note: 'Công viên giải trí đỉnh cao đảo Hòn Tre', category: 'experience' }
        ]
      }
    ],
    hotSpots: [
      { id: 'nt_h1', name: 'Tháp Bà Ponagar', category: 'culture', categoryLabel: 'Di tích', lat: 12.2654, lng: 109.1958, note: 'Quần thể tháp Chăm uy nghiêm' },
      { id: 'nt_h2', name: 'Hòn Mun Lặn Biển', category: 'nature', categoryLabel: 'Khu bảo tồn', lat: 12.1678, lng: 109.3021, note: 'Rạn san hô tự nhiên đa dạng hàng đầu' }
    ]
  },
  'hue': {
    name: 'Huế',
    province: 'Thừa Thiên Huế',
    fullName: 'Huế, Thừa Thiên Huế',
    coords: [16.4637, 107.5909],
    weather: { temp: '26°C', condition: 'Dịu mát, gió sông Hương lãng đãng', tip: 'Nên thuê áo dài truyền thống chụp ảnh' },
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Đại Nội Kinh Thành & Chùa Thiên Mụ',
        duration: '1 ngày',
        highlight: 'Hoàng thành triều Nguyễn, chùa cổ bên dòng sông Hương',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 801, name: 'Đại Nội Huế', time: '08:00', lat: 16.4698, lng: 107.5786, status: 'completed', note: 'Cung điện nguy nga của 13 vị vua triều Nguyễn', category: 'culture' },
          { id: 802, name: 'Bún Bò Huế Mụ Rơi', time: '11:45', lat: 16.4612, lng: 107.5925, status: 'active', note: 'Bún bò chuẩn vị cố đô đậm đà ruốc sả', category: 'food' },
          { id: 803, name: 'Chùa Thiên Mụ', time: '14:30', lat: 16.4529, lng: 107.5451, status: 'pending', note: 'Ngôi chùa cổ kính soi bóng bên sông Hương', category: 'culture' }
        ]
      }
    ],
    hotSpots: [
      { id: 'hue_h1', name: 'Đại Nội Kinh Thành Huế', category: 'culture', categoryLabel: 'Hoàng cung', lat: 16.4698, lng: 107.5786, note: 'Di sản thế giới UNESCO lưu giữ vàng son quá khứ' },
      { id: 'hue_h2', name: 'Chợ Đông Ba', category: 'food', categoryLabel: 'Ẩm thực', lat: 16.4691, lng: 107.5942, note: 'Bánh bèo, nậm, lọc và chè hẻm 20 món' }
    ]
  },
  'hanoi': {
    name: 'Hà Nội',
    province: 'Hà Nội',
    fullName: 'Hà Nội, Việt Nam',
    coords: [21.0285, 105.8542],
    weather: { temp: '27°C', condition: 'Tiết trời thu mát mẻ, nắng nhẹ', tip: 'Dạo phố đi bộ Hồ Gươm và thưởng thức cà phê trứng' },
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Hồ Hoàn Kiếm, Phố Cổ 36 Phố Phường',
        duration: '1 ngày',
        highlight: 'Trái tim ngàn năm văn hiến, Tháp Rùa và ẩm thực đường phố',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 901, name: 'Hồ Hoàn Kiếm & Đền Ngọc Sơn', time: '08:00', lat: 21.0307, lng: 105.8524, status: 'completed', note: 'Điểm hẹn trung tâm thủ đô', category: 'culture' },
          { id: 902, name: 'Phở Bát Đàn', time: '11:30', lat: 21.0339, lng: 105.8475, status: 'active', note: 'Hương vị phở bò gia truyền trứ danh', category: 'food' },
          { id: 903, name: 'Văn Miếu Quốc Tử Giám', time: '14:30', lat: 21.0293, lng: 105.8360, status: 'pending', note: 'Trường đại học đầu tiên của Việt Nam', category: 'culture' }
        ]
      }
    ],
    hotSpots: [
      { id: 'hn_h1', name: 'Hồ Hoàn Kiếm & Cầu Thê Húc', category: 'culture', categoryLabel: 'Biểu tượng', lat: 21.0307, lng: 105.8524, note: 'Trái tim của thủ đô ngàn năm' },
      { id: 'hn_h2', name: 'Cà Phê Giảng Yên Phụ', category: 'cafe', categoryLabel: 'Cà phê', lat: 21.0378, lng: 105.8528, note: 'Khởi nguồn cà phê trứng nức tiếng' },
      { id: 'hn_h3', name: 'Chợ Đồng Xuân', category: 'food', categoryLabel: 'Ẩm thực', lat: 21.0381, lng: 105.8496, note: 'Chợ đầu mối ẩm thực phong phú' }
    ]
  },
  'saigon': {
    name: 'TP. Hồ Chí Minh',
    province: 'TP. Hồ Chí Minh',
    fullName: 'TP. Hồ Chí Minh, Việt Nam',
    coords: [10.8231, 106.6297],
    weather: { temp: '31°C', condition: 'Nắng ấm, chiều có gió sông', tip: 'Mang theo dù che nắng và nón' },
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
    dayPlans: [
      {
        dayNumber: 1,
        dayTitle: 'Ngày 1: Nhà Thờ Đức Bà, Bưu Điện & Chợ Bến Thành',
        duration: '1 ngày',
        highlight: 'Kiến trúc Pháp cổ và nhịp sống đô thị năng động bậc nhất',
        badge: 'Khuyên dùng cho Ngày 1',
        stops: [
          { id: 951, name: 'Nhà Thờ Đức Bà & Bưu Điện Trung Tâm', time: '08:30', lat: 10.7798, lng: 106.6990, status: 'completed', note: 'Công trình kiến trúc biểu tượng Sài Gòn', category: 'culture' },
          { id: 952, name: 'Chợ Bến Thành', time: '11:00', lat: 10.7725, lng: 106.6980, status: 'active', note: 'Tham quan và thưởng thức chè Sài Gòn', category: 'food' },
          { id: 953, name: 'Phố Đi Bộ Nguyễn Huệ & Landmark 81', time: '17:30', lat: 10.7735, lng: 106.7034, status: 'pending', note: 'Tòa nhà cao nhất Việt Nam ngắm thành phố lên đèn', category: 'checkin' }
        ]
      }
    ],
    hotSpots: [
      { id: 'sg_h1', name: 'Bưu Điện Trung Tâm Sài Gòn', category: 'culture', categoryLabel: 'Di tích', lat: 10.7798, lng: 106.6990, note: 'Kiến trúc Gothic cổ điển tuyệt đẹp' },
      { id: 'sg_h2', name: 'Landmark 81 Skyview', category: 'checkin', categoryLabel: 'Hiện đại', lat: 10.7950, lng: 106.7218, note: 'Đài quan sát toàn cảnh thành phố' },
      { id: 'sg_h3', name: 'Hồ Con Rùa', category: 'cafe', categoryLabel: 'Cà phê', lat: 10.7825, lng: 106.6961, note: 'Không gian cà phê bệt và dạo mát' }
    ]
  }
};

// Sync tours alias on all destinations so both dayPlans and tours work everywhere
for (const k in OSM_DESTINATIONS) {
  const d = OSM_DESTINATIONS[k];
  if (d.dayPlans && !d.tours) {
    d.tours = d.dayPlans.map(p => ({
      title: p.dayTitle,
      duration: p.duration,
      highlight: p.highlight,
      stops: p.stops
    }));
  }
}

// Default seeded trips
function getSeedTrips() {
  const dalat = OSM_DESTINATIONS['dalat'];
  return [
    {
      id: 'trip_1001',
      title: 'Khám phá Đà Lạt & Đồi Chè',
      destination: 'Đà Lạt, Lâm Đồng',
      city: 'Đà Lạt',
      cityKey: 'dalat',
      coords: [11.9404, 108.4583],
      startDate: '25/09/2026',
      endDate: '28/09/2026',
      duration: '3 ngày 2 đêm',
      status: 'upcoming',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
      members: [
        { name: 'Bạn đồng hành B', phone: '0912 345 678', avatar: 'B', online: true },
        { name: 'Bạn đồng hành C', phone: '0987 654 321', avatar: 'C', online: true },
        { name: 'Bạn đồng hành D', phone: '0903 123 456', avatar: 'D', online: false }
      ],
      aiScheduled: false,
      aiPrompt: '',
      aiPreferences: [],
      stops: [
        { id: 1, dayNumber: 1, name: 'Quảng trường Lâm Viên', time: '08:30', lat: 11.9365, lng: 108.4452, status: 'completed', note: 'Tập kết đoàn, check-in Nụ hoa Atiso' },
        { id: 2, dayNumber: 1, name: 'Hồ Xuân Hương', time: '10:15', lat: 11.9419, lng: 108.4442, status: 'active', note: 'Đạp vịt, uống sữa đậu nành nóng và dạo bờ hồ' },
        { id: 3, dayNumber: 1, name: 'Tiệm Cà Phê Mây Lang Thang', time: '14:30', lat: 11.9281, lng: 108.4310, status: 'pending', note: 'Ngắm hoàng hôn thung lũng mộng mơ' }
      ]
    }
  ];
}

// Initial sample expense data for group trips
function getSeedExpenses() {
  return {
    'trip_1001': [
      { id: 'exp_0', title: 'Thuê xe máy & Xăng xe', name: 'Thuê xe máy & Xăng xe', amount: 1500000, payer: 'Bạn (Trưởng đoàn)', category: 'Di chuyển', date: '25/09' },
      { id: 'exp_1', title: 'Homestay 3N2Đ', name: 'Homestay 3N2Đ', amount: 2400000, payer: 'Bạn (Trưởng đoàn)', category: 'Lưu trú', date: '25/09' },
      { id: 'exp_2', title: 'Tiền ăn uống ngày 1', name: 'Tiền ăn uống ngày 1', amount: 450000, payer: 'Bạn đồng hành B', category: 'Ăn uống', date: '25/09' }
    ]
  };
}

// Initial sample checklist
function getSeedChecklist() {
  return {
    'trip_1001': [
      { id: 'chk_1', text: 'CCCD / Giấy tờ tùy thân', checked: true },
      { id: 'chk_2', text: 'Trang phục & Đồ giữ ấm', checked: true },
      { id: 'chk_3', text: 'Sạc điện thoại & Pin dự phòng', checked: false }
    ]
  };
}

// Dọn dẹp cache cũ nếu có trong localStorage để đảm bảo chuyến đi chỉ lưu tạm thời theo phiên
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(TRIPS_STORAGE_KEY);
    localStorage.removeItem(EXPENSES_STORAGE_KEY);
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
  }
} catch (e) {}

// In-Memory store: Các chuyến đi được tạo sẽ lưu tạm thời trong phiên làm việc, tự động reset khi reload lại trang (F5)
let inMemoryTrips = JSON.parse(JSON.stringify(getSeedTrips()));
let inMemoryExpenses = JSON.parse(JSON.stringify(getSeedExpenses()));
let inMemoryChecklist = JSON.parse(JSON.stringify(getSeedChecklist()));

// Trips API (In-Memory Temporary Session Store)
const TripsStore = {
  getAllTrips() {
    if (!inMemoryTrips || !Array.isArray(inMemoryTrips)) {
      inMemoryTrips = JSON.parse(JSON.stringify(getSeedTrips()));
    }
    return inMemoryTrips;
  },

  getTripById(id) {
    const trips = this.getAllTrips();
    return trips.find(t => String(t.id) === String(id)) || null;
  },

  createTrip(newTrip) {
    const trips = this.getAllTrips();
    const dest = this.getOsmDestination(newTrip.cityKey || newTrip.city || newTrip.destination);

    // Enforce cross-day stop deduplication at the store level
    const rawStops = Array.isArray(newTrip.stops) ? newTrip.stops : [];
    const dedupedStops = [];
    const seenStopNames = new Set();
    rawStops.forEach(s => {
      const key = (s.name || '').trim().toLowerCase();
      if (key && !seenStopNames.has(key)) {
        seenStopNames.add(key);
        dedupedStops.push(s);
      }
    });

    const trip = {
      id: newTrip.id || `trip_${Date.now()}`,
      title: newTrip.title || `Chuyến đi ${newTrip.city || newTrip.destination || 'mới'}`,
      destination: newTrip.destination || (dest ? dest.fullName : 'Điểm đến mới'),
      city: newTrip.city || (dest ? dest.name : 'Địa điểm'),
      cityKey: newTrip.cityKey || (dest ? dest.key : 'custom'),
      coords: newTrip.coords || (dest ? dest.coords : [16.0544, 108.2022]),
      startDate: newTrip.startDate || 'Sắp tới',
      endDate: newTrip.endDate || '',
      duration: newTrip.duration || '1 ngày',
      status: newTrip.status || 'upcoming',
      image: newTrip.image || (dest ? dest.image : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80'),
      members: newTrip.members || [],
      aiScheduled: !!newTrip.aiScheduled,
      aiPrompt: newTrip.aiPrompt || '',
      aiPreferences: newTrip.aiPreferences || [],
      stops: dedupedStops,
      dayPlans: newTrip.dayPlans || [],
      createdAt: Date.now()
    };
    trips.unshift(trip);
    return trip;
  },

  isStopInTrip(tripId, stopName) {
    const trip = this.getTripById(tripId);
    if (!trip || !Array.isArray(trip.stops)) return false;
    const target = (stopName || '').trim().toLowerCase();
    return trip.stops.some(s => (s.name || '').trim().toLowerCase() === target);
  },

  hasStopBeenVisited(tripId, stopName) {
    const trip = this.getTripById(tripId);
    if (!trip || !Array.isArray(trip.stops)) return false;
    const target = (stopName || '').trim().toLowerCase();
    const found = trip.stops.find(s => (s.name || '').trim().toLowerCase() === target);
    return found ? found.status === 'completed' : false;
  },

  updateStopStatus(tripId, stopId, newStatus) {
    const trips = this.getAllTrips();
    const trip = trips.find(t => String(t.id) === String(tripId));
    if (!trip || !Array.isArray(trip.stops)) return null;

    let targetStop = null;
    trip.stops.forEach(s => {
      if (String(s.id) === String(stopId)) {
        s.status = newStatus;
        targetStop = s;
      }
    });

    if (newStatus === 'active') {
      trip.stops.forEach(s => {
        if (String(s.id) !== String(stopId) && s.status === 'active') {
          s.status = 'completed';
        }
      });
    }

    return { trip, stop: targetStop };
  },

  removeTripMember(tripId, memberName) {
    const trip = this.getTripById(tripId);
    if (!trip || !Array.isArray(trip.members)) return trip;
    const target = (memberName || '').trim().toLowerCase();
    trip.members = trip.members.filter(m => {
      const name = (typeof m === 'string' ? m : (m?.name || m?.fullName || '')).trim().toLowerCase();
      return name !== target;
    });
    return trip;
  },

  deleteTrip(tripId) {
    let trips = this.getAllTrips();
    inMemoryTrips = trips.filter(t => String(t.id) !== String(tripId));
    return inMemoryTrips;
  },

  resetDemo() {
    inMemoryTrips = JSON.parse(JSON.stringify(getSeedTrips()));
    inMemoryExpenses = JSON.parse(JSON.stringify(getSeedExpenses()));
    inMemoryChecklist = JSON.parse(JSON.stringify(getSeedChecklist()));
    return inMemoryTrips;
  },

  getOsmDestinations() {
    return OSM_DESTINATIONS;
  },

  // Lookup approximate coords from built-in 63-province dictionary
  lookupKnownCoords(cityName) {
    if (!cityName) return null;
    const clean = removeVietnameseTones(cityName).replace(/[^a-z0-9]/g, '');
    if (!clean) return null;
    for (const k in KNOWN_COORDINATES) {
      if (k === clean) return KNOWN_COORDINATES[k].coords;
      const itemClean = removeVietnameseTones(KNOWN_COORDINATES[k].name).replace(/[^a-z0-9]/g, '');
      if (itemClean && itemClean === clean) return KNOWN_COORDINATES[k].coords;
      if (k.length >= 3 && clean.includes(k)) return KNOWN_COORDINATES[k].coords;
      if (itemClean && itemClean.length >= 3 && clean.includes(itemClean)) return KNOWN_COORDINATES[k].coords;
    }
    return null;
  },

  // Dynamically create and cache a complete destination object for ANY city in the world
  // NEVER falls back to Đà Lạt!
  createDynamicDestination(cityName, coords) {
    const safeName = (cityName || 'Điểm đến mới').trim();
    const cleanKey = 'dest_' + removeVietnameseTones(safeName).replace(/[^a-z0-9]/g, '');

    if (OSM_DESTINATIONS[cleanKey]) {
      return OSM_DESTINATIONS[cleanKey];
    }

    const c = coords || this.lookupKnownCoords(safeName) || [16.0544, 108.2022];
    const lat = Array.isArray(c) ? c[0] : (c.lat || 16.0544);
    const lon = Array.isArray(c) ? c[1] : (c.lon || c.lng || 108.2022);

    const dynamicDest = {
      key: cleanKey,
      name: safeName,
      province: safeName,
      fullName: safeName + ', Việt Nam',
      coords: [lat, lon],
      weather: { temp: '26°C', condition: 'Thời tiết mát mẻ, thuận lợi', tip: 'Chuẩn bị trang phục thoải mái và sạc dự phòng' },
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
      dayPlans: [
        {
          dayNumber: 1,
          dayTitle: `Ngày 1: Khám phá trung tâm & thắng cảnh ${safeName}`,
          duration: '1 ngày',
          highlight: `Khởi hành, dạo phố và chiêm ngưỡng danh lam thắng cảnh tiêu biểu tại ${safeName}`,
          badge: 'Khuyên dùng cho Ngày 1',
          stops: [
            { id: `dyn_s1_${Date.now()}`, name: `Trung tâm ${safeName}`, time: '08:30', lat: lat, lng: lon, status: 'completed', note: 'Điểm khởi hành và tập kết tham quan', category: 'checkin' },
            { id: `dyn_s2_${Date.now()}`, name: `Thắng cảnh ${safeName}`, time: '11:00', lat: +(lat + 0.015).toFixed(4), lng: +(lon + 0.012).toFixed(4), status: 'active', note: 'Thiên nhiên tươi đẹp và điểm ngắm cảnh', category: 'nature' },
            { id: `dyn_s3_${Date.now()}`, name: `Phố ẩm thực ${safeName}`, time: '18:30', lat: +(lat - 0.011).toFixed(4), lng: +(lon - 0.008).toFixed(4), status: 'pending', note: 'Thưởng thức các món ngon bản địa', category: 'food' }
          ]
        },
        {
          dayNumber: 2,
          dayTitle: `Ngày 2: Văn hóa, di tích & trải nghiệm ${safeName}`,
          duration: '1 ngày',
          highlight: `Trải nghiệm đời sống bản địa, các món đặc sản và di tích tại ${safeName}`,
          badge: 'Khuyên dùng cho Ngày 2',
          stops: [
            { id: `dyn_s4_${Date.now()}`, name: `Di tích lịch sử ${safeName}`, time: '09:00', lat: +(lat + 0.022).toFixed(4), lng: +(lon - 0.015).toFixed(4), status: 'pending', note: 'Khám phá văn hóa và kiến trúc truyền thống', category: 'culture' },
            { id: `dyn_s5_${Date.now()}`, name: `Điểm ngắm hoàng hôn & Cafe ${safeName}`, time: '16:30', lat: +(lat - 0.018).toFixed(4), lng: +(lon + 0.020).toFixed(4), status: 'pending', note: 'View toàn cảnh thư giãn cuối ngày', category: 'cafe' }
          ]
        }
      ],
      hotSpots: [
        { id: `${cleanKey}_h1`, name: `Trung tâm ${safeName}`, category: 'checkin', categoryLabel: 'Điểm hẹn', lat: lat, lng: lon, note: 'Khởi hành và check-in trung tâm' },
        { id: `${cleanKey}_h2`, name: `Thắng cảnh ${safeName}`, category: 'nature', categoryLabel: 'Thắng cảnh', lat: +(lat + 0.015).toFixed(4), lng: +(lon + 0.012).toFixed(4), note: 'Thiên nhiên và điểm ngắm cảnh nổi bật' },
        { id: `${cleanKey}_h3`, name: `Phố ẩm thực ${safeName}`, category: 'food', categoryLabel: 'Ẩm thực', lat: +(lat - 0.011).toFixed(4), lng: +(lon - 0.008).toFixed(4), note: 'Các món ngon và đặc sản địa phương' },
        { id: `${cleanKey}_h4`, name: `Khu di tích văn hóa ${safeName}`, category: 'culture', categoryLabel: 'Văn hóa', lat: +(lat + 0.022).toFixed(4), lng: +(lon - 0.015).toFixed(4), note: 'Không gian văn hóa và lịch sử' },
        { id: `${cleanKey}_h5`, name: `Cà phê view đẹp ${safeName}`, category: 'cafe', categoryLabel: 'Cà phê', lat: +(lat - 0.018).toFixed(4), lng: +(lon + 0.020).toFixed(4), note: 'Thư giãn thưởng thức cà phê' }
      ]
    };

    dynamicDest.tours = dynamicDest.dayPlans.map(p => ({
      title: p.dayTitle,
      duration: p.duration,
      highlight: p.highlight,
      stops: p.stops
    }));

    OSM_DESTINATIONS[cleanKey] = dynamicDest;
    return dynamicDest;
  },

  // Retrieve destination by key or city name. NEVER falls back to Đà Lạt!
  getOsmDestination(key) {
    if (!key) return null;
    const clean = removeVietnameseTones(key).replace(/[^a-z0-9]/g, '');

    // 1. Direct key match in OSM_DESTINATIONS
    if (OSM_DESTINATIONS[key]) return OSM_DESTINATIONS[key];
    if (clean && OSM_DESTINATIONS[clean]) return OSM_DESTINATIONS[clean];

    // 2. Fuzzy search in OSM_DESTINATIONS
    for (const k in OSM_DESTINATIONS) {
      if (k === key || (clean && k === clean)) {
        return OSM_DESTINATIONS[k];
      }
      const item = OSM_DESTINATIONS[k];
      const nameClean = removeVietnameseTones(item.name || '').replace(/[^a-z0-9]/g, '');
      if (clean && nameClean && (clean === nameClean || (clean.length >= 3 && clean.includes(nameClean)))) {
        return item;
      }
    }

    // 3. Match from known Vietnamese coordinates table
    for (const k in KNOWN_COORDINATES) {
      const info = KNOWN_COORDINATES[k];
      const nameClean = removeVietnameseTones(info.name || '').replace(/[^a-z0-9]/g, '');
      if (clean && (k === clean || (nameClean && nameClean === clean))) {
        return this.createDynamicDestination(info.name, info.coords);
      }
      if (clean && k.length >= 3 && clean.includes(k)) {
        return this.createDynamicDestination(info.name, info.coords);
      }
      if (clean && nameClean && nameClean.length >= 3 && clean.includes(nameClean)) {
        return this.createDynamicDestination(info.name, info.coords);
      }
    }

    // 4. Fallback: generate a dynamic destination for this exact city, NEVER DALAT!
    return this.createDynamicDestination(key);
  },

  // Multi-day trip plans for a destination
  getDayPlans(cityName) {
    const dest = this.getOsmDestination(cityName);
    if (dest && dest.dayPlans && dest.dayPlans.length > 0) {
      return dest.dayPlans;
    }
    const created = this.createDynamicDestination(cityName);
    return created.dayPlans;
  },

  // Hot recommended locations for a destination
  getHotSpots(cityName, category) {
    const dest = this.getOsmDestination(cityName);
    const spots = dest && dest.hotSpots ? dest.hotSpots : this.createDynamicDestination(cityName).hotSpots;
    if (!category || category === 'all') return spots;
    return spots.filter(s => s.category === category);
  },

  // Dynamic API query: search places in a city via Nominatim + local spots
  async searchOsmPlaces(cityName, queryText) {
    const dest = this.getOsmDestination(cityName) || this.createDynamicDestination(cityName);
    const localHot = dest.hotSpots || [];

    const matchedLocal = localHot.filter(s => 
      s.name.toLowerCase().includes(queryText.toLowerCase()) || 
      (s.note && s.note.toLowerCase().includes(queryText.toLowerCase()))
    );

    try {
      const q = `${queryText} ${dest.name || ''}`.trim();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=vn&limit=5`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const osmResults = await res.json();
        if (Array.isArray(osmResults) && osmResults.length > 0) {
          const formatted = osmResults.map(item => ({
            id: `osm_${item.osm_id}`,
            name: item.name || item.display_name.split(',')[0],
            category: 'custom',
            categoryLabel: 'OpenStreetMap',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            note: item.display_name
          }));
          return [...matchedLocal, ...formatted];
        }
      }
    } catch (e) {
      // Return local matches if offline or API rate-limited
    }

    return matchedLocal;
  },

  // Resolve destination from user input via OpenStreetMap.
  // GUARANTEES to return the user's requested destination, NEVER falls back to Đà Lạt!
  async resolveDestinationFromOsm(query) {
    if (!query || !query.trim()) return null;
    const q = query.trim();
    const cleanQ = removeVietnameseTones(q).replace(/[^a-z0-9]/g, '');

    // 1. Check curated destinations first
    for (const k in OSM_DESTINATIONS) {
      const dest = OSM_DESTINATIONS[k];
      const nameClean = removeVietnameseTones(dest.name || '').replace(/[^a-z0-9]/g, '');
      const fullClean = removeVietnameseTones(dest.fullName || '').replace(/[^a-z0-9]/g, '');
      if (cleanQ && nameClean && (nameClean === cleanQ || (nameClean.length >= 3 && cleanQ.includes(nameClean)))) {
        return dest;
      }
      if (cleanQ && fullClean && (fullClean === cleanQ || (fullClean.length >= 3 && cleanQ.includes(fullClean)))) {
        return dest;
      }
    }

    // 2. Check 63 provinces known coordinates dictionary
    for (const k in KNOWN_COORDINATES) {
      const info = KNOWN_COORDINATES[k];
      const nameClean = removeVietnameseTones(info.name || '').replace(/[^a-z0-9]/g, '');
      if (cleanQ && (k === cleanQ || (nameClean && nameClean === cleanQ))) {
        return this.createDynamicDestination(info.name, info.coords);
      }
      if (cleanQ && k.length >= 3 && cleanQ.includes(k)) {
        return this.createDynamicDestination(info.name, info.coords);
      }
      if (cleanQ && nameClean && nameClean.length >= 3 && cleanQ.includes(nameClean)) {
        return this.createDynamicDestination(info.name, info.coords);
      }
    }

    // 3. Query OpenStreetMap (Photon API + Nominatim API)
    try {
      // Try Photon API first (Fast, robust, CORS-friendly OpenStreetMap geocoder)
      const photonController = new AbortController();
      const pTimeout = setTimeout(() => photonController.abort(), 2500);
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3`;
      const pRes = await fetch(photonUrl, { signal: photonController.signal });
      clearTimeout(pTimeout);

      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData && pData.features && pData.features.length > 0) {
          const feat = pData.features[0];
          const coords = [feat.geometry.coordinates[1], feat.geometry.coordinates[0]];
          const name = feat.properties.name || q;
          return this.createDynamicDestination(name, coords);
        }
      }
    } catch (pe) {}

    try {
      // Try Nominatim API next
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=3`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const item = list[0];
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const title = item.name || item.display_name.split(',')[0] || q;
          return this.createDynamicDestination(title, [lat, lon]);
        }
      }
    } catch (e) {}

    // 4. Safe fallback: dynamically create destination using query name and default coordinates. NEVER return Dalat!
    return this.createDynamicDestination(q);
  },

  // Search cities / areas for autocomplete dropdowns. Returns results matching the query.
  async searchOsmLocation(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim();
    const cleanQ = removeVietnameseTones(q).replace(/[^a-z0-9]/g, '');

    const matches = [];

    // 1. Search in curated OSM_DESTINATIONS
    for (const k in OSM_DESTINATIONS) {
      const dest = OSM_DESTINATIONS[k];
      const nameClean = removeVietnameseTones(dest.name || '').replace(/[^a-z0-9]/g, '');
      const fullClean = removeVietnameseTones(dest.fullName || '').replace(/[^a-z0-9]/g, '');
      if (cleanQ && ((nameClean && (nameClean === cleanQ || nameClean.includes(cleanQ) || (cleanQ.length >= 3 && cleanQ.includes(nameClean)))) ||
                    (fullClean && (fullClean === cleanQ || fullClean.includes(cleanQ) || (cleanQ.length >= 3 && cleanQ.includes(fullClean)))))) {
        const full = (dest.fullName && dest.fullName.includes('Việt Nam')) ? dest.fullName : (dest.fullName ? `${dest.fullName}, Việt Nam` : `${dest.name}, Việt Nam`);
        matches.push({
          name: dest.name,
          city: dest.name,
          key: k,
          cityKey: k,
          fullName: full,
          display_name: full,
          coords: dest.coords,
          lat: dest.coords[0],
          lon: dest.coords[1],
          lng: dest.coords[1],
          province: dest.province || '',
          source: 'curated'
        });
      }
    }

    // 2. Search in KNOWN_COORDINATES
    for (const k in KNOWN_COORDINATES) {
      const info = KNOWN_COORDINATES[k];
      const nameClean = removeVietnameseTones(info.name || '').replace(/[^a-z0-9]/g, '');
      const isMatch = cleanQ && (
        k === cleanQ || k.includes(cleanQ) || (cleanQ.length >= 3 && cleanQ.includes(k)) ||
        (nameClean && (nameClean === cleanQ || nameClean.includes(cleanQ) || (cleanQ.length >= 3 && cleanQ.includes(nameClean))))
      );
      if (isMatch) {
        if (!matches.some(m => (m.name || m.city).toLowerCase() === info.name.toLowerCase())) {
          const prov = (info.province && info.province.toLowerCase() !== info.name.toLowerCase()) 
            ? `${info.name}, ${info.province}, Việt Nam` 
            : `${info.name}, Việt Nam`;
          matches.push({
            name: info.name,
            city: info.name,
            key: k,
            cityKey: k,
            fullName: prov,
            display_name: prov,
            coords: info.coords,
            lat: info.coords[0],
            lon: info.coords[1],
            lng: info.coords[1],
            province: info.province || '',
            source: 'dictionary'
          });
        }
      }
    }

    // 3. Online OpenStreetMap Geocoding (Photon + Nominatim)
    try {
      const photonController = new AbortController();
      const pTimeout = setTimeout(() => photonController.abort(), 2000);
      const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`, { signal: photonController.signal });
      clearTimeout(pTimeout);

      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData && pData.features) {
          pData.features.forEach(f => {
            const cityName = f.properties.name || q;
            const full = [cityName, f.properties.state, f.properties.country].filter(Boolean).join(', ');
            const lat = f.geometry.coordinates[1];
            const lon = f.geometry.coordinates[0];
            const key = 'custom_' + removeVietnameseTones(cityName).replace(/[^a-z0-9]/g, '');
            if (!matches.some(m => (m.name || m.city).toLowerCase() === cityName.toLowerCase())) {
              matches.push({
                name: cityName,
                city: cityName,
                key: key,
                cityKey: key,
                fullName: full,
                display_name: full,
                coords: [lat, lon],
                lat: lat,
                lon: lon,
                lng: lon,
                province: f.properties.state || '',
                source: 'osm'
              });
            }
          });
        }
      }
    } catch (pe) {}

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const osmResults = await res.json();
        if (Array.isArray(osmResults)) {
          osmResults.forEach(item => {
            const cityName = item.name || item.display_name.split(',')[0] || q;
            const key = 'custom_' + removeVietnameseTones(cityName).replace(/[^a-z0-9]/g, '');
            if (!matches.some(m => (m.name || m.city).toLowerCase() === cityName.toLowerCase())) {
              const latNum = parseFloat(item.lat);
              const lonNum = parseFloat(item.lon);
              matches.push({
                name: cityName,
                city: cityName,
                key: key,
                cityKey: key,
                fullName: item.display_name,
                display_name: item.display_name,
                coords: [latNum, lonNum],
                lat: latNum,
                lon: lonNum,
                lng: lonNum,
                source: 'osm'
              });
            }
          });
        }
      }
    } catch (e) {}

    // 4. If still no matches, generate a dynamic matching entry for the user's typed query! NEVER DALAT!
    if (matches.length === 0) {
      const dynamicDest = this.createDynamicDestination(q);
      matches.push({
        name: dynamicDest.name,
        city: dynamicDest.name,
        key: dynamicDest.key,
        cityKey: dynamicDest.key,
        fullName: dynamicDest.fullName,
        display_name: dynamicDest.fullName,
        coords: dynamicDest.coords,
        lat: dynamicDest.coords[0],
        lon: dynamicDest.coords[1],
        lng: dynamicDest.coords[1],
        province: dynamicDest.province || '',
        source: 'generated'
      });
    }

    return matches;
  },

  // OpenStreetMap OSRM Road Routing API
  async getRoadRoute(waypoints) {
    if (!waypoints || waypoints.length < 2) return null;

    try {
      const formatted = waypoints.map(p => {
        const lat = Array.isArray(p) ? p[0] : p.lat;
        const lng = Array.isArray(p) ? p[1] : (p.lng || p.lon);
        return `${lng},${lat}`;
      });

      const coordStr = formatted.join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const roadLatLngs = route.geometry.coordinates.map(c => [c[1], c[0]]);
          return {
            latLngs: roadLatLngs,
            distanceKm: (route.distance / 1000).toFixed(1),
            durationMins: Math.round(route.duration / 60),
            isRoad: true
          };
        }
      }
    } catch (e) {
      console.warn('OSRM routing fetch warning, falling back to direct points:', e);
    }

    const fallback = waypoints.map(p => {
      const lat = Array.isArray(p) ? p[0] : p.lat;
      const lng = Array.isArray(p) ? p[1] : (p.lng || p.lon);
      return [lat, lng];
    });

    return {
      latLngs: fallback,
      distanceKm: null,
      durationMins: null,
      isRoad: false
    };
  },

  // ==================== APP ENHANCEMENT: GROUP EXPENSES ====================
  getExpenses(tripId) {
    if (!inMemoryExpenses) {
      inMemoryExpenses = JSON.parse(JSON.stringify(getSeedExpenses()));
    }
    if (inMemoryExpenses[tripId]) return inMemoryExpenses[tripId];
    return [];
  },

  addExpense(tripId, expense) {
    if (!inMemoryExpenses) {
      inMemoryExpenses = JSON.parse(JSON.stringify(getSeedExpenses()));
    }
    if (!inMemoryExpenses[tripId]) inMemoryExpenses[tripId] = [];
    const textLabel = expense.title || expense.name || 'Khoản chi tiêu';
    const item = {
      id: `exp_${Date.now()}`,
      title: textLabel,
      name: textLabel,
      amount: parseInt(expense.amount, 10) || 0,
      payer: expense.payer || 'Bạn (Trưởng đoàn)',
      category: expense.category || 'Chi phí chung',
      date: expense.date || 'Hôm nay'
    };
    inMemoryExpenses[tripId].unshift(item);
    return item;
  },

  deleteExpense(tripId, expenseId) {
    if (!inMemoryExpenses) {
      inMemoryExpenses = JSON.parse(JSON.stringify(getSeedExpenses()));
    }
    if (inMemoryExpenses[tripId]) {
      inMemoryExpenses[tripId] = inMemoryExpenses[tripId].filter(e => e.id !== expenseId);
    }
    return inMemoryExpenses[tripId] || [];
  },

  // ==================== APP ENHANCEMENT: TRIP PACKING CHECKLIST ====================
  getChecklist(tripId) {
    if (!inMemoryChecklist) {
      inMemoryChecklist = JSON.parse(JSON.stringify(getSeedChecklist()));
    }
    if (inMemoryChecklist[tripId]) return inMemoryChecklist[tripId];
    return [
      { id: 'c1', text: 'CCCD / Hộ chiếu cá nhân', checked: true },
      { id: 'c2', text: 'Trang phục & Đồ giữ ấm', checked: false },
      { id: 'c3', text: 'Sạc điện thoại & Pin dự phòng', checked: false }
    ];
  },

  toggleChecklist(tripId, itemId) {
    const list = this.getChecklist(tripId);
    list.forEach(i => {
      if (i.id === itemId) i.checked = !i.checked;
    });
    inMemoryChecklist[tripId] = list;
    return list;
  },

  addChecklistItem(tripId, text) {
    if (!text || !text.trim()) return null;
    const list = this.getChecklist(tripId);
    const item = {
      id: `chk_${Date.now()}`,
      text: text.trim(),
      checked: false
    };
    list.push(item);
    inMemoryChecklist[tripId] = list;
    return item;
  },

  deleteChecklistItem(tripId, itemId) {
    let list = this.getChecklist(tripId);
    list = list.filter(i => i.id !== itemId);
    inMemoryChecklist[tripId] = list;
    return list;
  }
};

if (typeof window !== 'undefined') {
  window.TripsStore = TripsStore;
  window.OSM_DESTINATIONS = OSM_DESTINATIONS;
}

export { TripsStore, OSM_DESTINATIONS, KNOWN_COORDINATES };
export default TripsStore;

