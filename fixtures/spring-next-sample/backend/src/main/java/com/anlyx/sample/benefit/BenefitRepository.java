package com.anlyx.sample.benefit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
interface BenefitRepository extends JpaRepository<Benefit, Long> {}
