package modeltest

import "encoding/json"

// This file is generated by the typespec compiler. Do not edit.
type Nullable[T any] struct {
	value *T
	isSet bool
}

func SetNullable[T any](v T) Nullable[T] {
	return Nullable[T]{value: &v, isSet: true}
}

func UnsetNullable[T any]() Nullable[T] {
	return Nullable[T]{isSet: false}
}

func NullNullable[T any]() Nullable[T] {
	return Nullable[T]{isSet: true}
}

func (n Nullable[T]) IsSet() bool {
	return n.isSet
}

func (n Nullable[T]) Value() T {
	return *n.value
}

func (n *Nullable[T]) SetValue(v T) {
	n.value = &v
	n.isSet = true
}

func (o Nullable[T]) MarshalJSON() ([]byte, error) {
	if o.isSet && o.value == nil {
		return []byte("null"), nil
	}
	return json.Marshal(o.value)
}

func (o *Nullable[T]) UnmarshalJSON(data []byte) error {
	o.isSet = true
	return json.Unmarshal(data, &o.value)
}

func Ptr[T any](v T) *T {
	return &v
}
