package com.example;

import java.util.List;

final class BenefitSearchService {
  private final BenefitRepository repository;

  BenefitSearchService(BenefitRepository repository) {
    this.repository = repository;
  }

  List<BenefitSummary> findVisibleBenefits(String keyword, String category) {
    if (keyword == null || keyword.isBlank()) {
      return List.of();
    }

    return repository.findVisibleByKeyword(keyword, category);
  }
}
