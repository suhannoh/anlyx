package com.example.items;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "items")
public class Item {
  public Long id() {
    return 42L;
  }

  public String name() {
    return "Example item";
  }
}
