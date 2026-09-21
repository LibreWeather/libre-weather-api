const capitalize = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default capitalize;
