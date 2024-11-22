namespace modeltest;

@discriminator("type")
model Bear {
  type: string;
  size: string;
}

model PolarBear extends Bear {
  type: "polar";
}

model GrizzlyBear extends Bear {
  type: "grizzly";
}
