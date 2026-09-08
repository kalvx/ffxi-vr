const fishingRoutes = {
  "0-11": { range: "Skill 0–11", fish: "Moat Carp", water: "Fresh water · Skill cap 11", location: "Mog Garden — pond", rod: "Halcyon Rod or Lu Shang’s Fishing Rod", bait: "Insect Ball", note: "A peaceful starting pool with easy Mog House access and no item catches." },
  "11-27": { range: "Skill 11–27", fish: "Nebimonite", water: "Salt water · Skill cap 27", location: "Sea Serpent Grotto — lake at J-12", rod: "Lu Shang’s Fishing Rod; Halcyon Rod also works", bait: "Crayfish Ball", note: "Try to reach fishing skill 15 before this step if bites are too infrequent." },
  "28-53": { range: "Skill 28–53", fish: "Istiridye", water: "Salt water · Skill cap 53", location: "Nashmau", rod: "Lu Shang’s Fishing Rod; Halcyon Rod also works", bait: "Robber Rig", note: "Nashmau keeps this stage convenient and safely inside town." },
  "53-90": { range: "Skill 53–90", fish: "Mercanbaligi / Ahtapot", water: "Salt water · Skill caps 86 and 90", location: "Nashmau or Talacca Cove", rod: "Lu Shang’s Fishing Rod; Halcyon may snap or break", bait: "Shrimp Lure", note: "Talacca Cove also provides chances at Dil while working through this range." },
  "90-plus": { range: "Skill 90+", fish: "Pterygotus", water: "Salt water · Skill cap 99", location: "Nashmau or Sih Gates — map 2", rod: "Lu Shang’s Fishing Rod; Halcyon may snap", bait: "Lugworm", note: "Nashmau remains the simplest option, though the bite rate is not especially high." }
};

const rangeSelect = document.querySelector("#fishing-skill-range");

function showFishingRoute() {
  const route = fishingRoutes[rangeSelect.value];
  document.querySelector("#fish-range").textContent = route.range;
  document.querySelector("#fish-name").textContent = route.fish;
  document.querySelector("#fish-water").textContent = route.water;
  document.querySelector("#fish-location").textContent = route.location;
  document.querySelector("#fish-rod").textContent = route.rod;
  document.querySelector("#fish-bait").textContent = route.bait;
  document.querySelector("#fish-note").textContent = route.note;
}

rangeSelect?.addEventListener("change", showFishingRoute);
