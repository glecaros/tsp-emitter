namespace modeltest;

@discriminator("type")
model Box {
  type: string;
}

model SmallBox extends Box {
  type: "small";
}

model LargeBox extends Box {
  type: "large";
}

model Storage {
  box: Box;
}
