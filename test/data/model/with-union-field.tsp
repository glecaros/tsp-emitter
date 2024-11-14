namespace modeltest;

model Cup {
  material: Material;
}

union Material {
  glass: "glass",
  tin: "tin",
}
