package generalunion

import (
	"encoding/json"
	"fmt"
)

type CompoundName struct {
	Name       string
	SecondName string
}

type Name interface {
	Type() string
}

type StringValue struct {
	Value string
}

func (m StringValue) Type() string {
	return "string"
}

type CompoundNameValue struct {
	Value CompoundName
}

func (m CompoundNameValue) Type() string {
	return "CompoundName"
}

func UnmarshalName(data []byte) (Name, error) {
	var err error
	var str string
	if err = json.Unmarshal(data, &str); err == nil {
		return StringValue{str}, nil
	}

	var compoundName CompoundName
	if err = json.Unmarshal(data, &compoundName); err == nil {
		return CompoundNameValue{compoundName}, nil
	}

	return nil, fmt.Errorf("failed to unmarshal Name")
}
