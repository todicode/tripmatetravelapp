const people = [
  { id: 'f1', name: 'Minh Tuấn', aliases: ['Tuấn'], online: true, relationship: 'Bạn bè', bio: 'Thích khám phá những điểm đến mới cùng bạn bè.' },
  { id: 'f2', name: 'Phương Thảo', aliases: ['Thảo'], online: false, relationship: 'Bạn bè', bio: 'Lưu lại những địa điểm đẹp cho chuyến đi tiếp theo.' },
  { id: 'person_lan', name: 'Lan', aliases: [], relationship: 'Thành viên nhóm', bio: 'Cùng lên kế hoạch cho những hành trình đáng nhớ.' }
];

export function getChatPerson(name, id) {
  const person = people.find(item => item.id === id)
    || people.find(item => item.name === name || item.aliases.includes(name));
  return person ? { ...person } : { id: id || `person_${name}`, name, relationship: 'Người tham gia trò chuyện', bio: '' };
}

export function getChatFriends() {
  return people.filter(person => person.relationship === 'Bạn bè').map(person => ({ ...person }));
}
