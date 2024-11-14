namespace discriminator;

@discriminator("kind")
union Pet {
  cat: Cat,
  dog: Dog,
}

model Cat {
  kind: "cat";
  meow: boolean;
}

model Dog {
  kind: "dog";
  bark: boolean;
}
