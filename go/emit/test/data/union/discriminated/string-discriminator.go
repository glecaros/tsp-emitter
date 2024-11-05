package discriminator

type StringDiscriminator interface {
	Kind() string
}

type Cat struct {
	Meow string
}

func (c Cat) Kind() string {
	return "cat"
}

type Dog struct {
	Bark string
}

func MarshalJSON(d StringDiscriminator) ([]byte, error) {
	return nil, nil
}

func UnmarshalJSON(data []byte) (StringDiscriminator, error) {
	return nil, nil
}

func (d Dog) Kind() string {
	return "dog"
}
