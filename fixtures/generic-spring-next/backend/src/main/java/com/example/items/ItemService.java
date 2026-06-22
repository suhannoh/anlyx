package com.example.items;

import org.springframework.stereotype.Service;

@Service
public class ItemService {
  private final ItemRepository itemRepository;

  public ItemService(ItemRepository itemRepository) {
    this.itemRepository = itemRepository;
  }

  public ItemDetailResponse findItem(Long id) {
    Item item = itemRepository.findById(id).orElseThrow();
    return new ItemDetailResponse(item.id(), item.name());
  }
}
