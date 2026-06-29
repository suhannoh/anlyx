package com.example;

import java.util.List;

interface BenefitRepository {
  List<BenefitSummary> findVisibleByKeyword(String keyword, String category);
}

record BenefitSummary(long id, String title, String brand) {}
