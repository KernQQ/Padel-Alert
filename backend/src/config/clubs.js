const clubs = [
  {
    slug: "padel-arena-poludniowa",
    id: 264,
    name: "Padel Arena Południowa",
    shortName: "Padel Arena",
    url: "https://bo5.pl/padelARENApoludniowa/reservation",
    address: "Szczecin",
    accent: "forest",
    courts: {
      1801: "Kort 1",
      1802: "Kort 2",
      1803: "Kort 3",
      1804: "Kort 4",
      1805: "Kort 5"
    },
    outdoorCourtIds: []
  },
  {
    slug: "padel-club",
    id: 595,
    name: "Padel Club",
    shortName: "Padel Club",
    url: "https://bo5.pl/padelclub/reservation",
    address: "Szczecin",
    accent: "blue",
    courts: {
      1662: "Kort 1",
      1663: "Kort 2",
      1664: "Kort 3",
      1665: "Kort 4"
    },
    outdoorCourtIds: []
  },
  {
    slug: "fabryka-energii",
    id: 528,
    name: "Fabryka Energii",
    shortName: "Fabryka Energii",
    url: "https://bo5.pl/fabrykaenergii/reservation/528/Padel",
    address: "Szczecin",
    accent: "amber",
    courts: {
      1340: "Kort 1 TAVASCAN",
      1339: "Kort 2 BABOLAT",
      1338: "Kort 3 BORN",
      1635: "Kort 4 FORMENTOR",
      1785: "Kort 5",
      1786: "Kort 6",
      1787: "Kort 7 ZEWNĘTRZNY"
    },
    outdoorCourtIds: ["1787"]
  }
];

function getClubBySlug(slug) {
  return clubs.find((club) => club.slug === slug);
}

function getPublicClubs() {
  return clubs.map((club) => ({
    slug: club.slug,
    id: club.id,
    name: club.name,
    shortName: club.shortName,
    url: club.url,
    address: club.address,
    accent: club.accent,
    courts: club.courts,
    outdoorCourtIds: club.outdoorCourtIds
  }));
}

module.exports = {
  clubs,
  getClubBySlug,
  getPublicClubs
};
