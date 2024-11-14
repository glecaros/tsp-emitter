namespace modeltest;

model Room {
  seating: Seating[];
}

@discriminator("type")
union Seating {
  Chair,
  Bench,
}

model Chair {
  type: "chair";
  legs: integer;
}

model Bench {
  type: "bench";
  length: integer;
}
